import {
  Station,
  Route,
  RouteSegment,
  RealtimeArrival,
} from "@/types/subway";
import {
  STATIONS_BY_ID,
  STATIONS_BY_NAME,
  getTransferWalkSeconds,
  getLineHeadway,
} from "./subway-data";

// ─── Graph Node ───────────────────────────────────────────────────────────────
interface GraphNode {
  stationId: string;
  cost: number; // total minutes
  path: string[]; // station IDs
  transfers: number;
  waitMinutes: number;
}

// ─── Build full adjacency including transfers ─────────────────────────────────
function getNeighbors(
  stationId: string
): Array<{ stationId: string; time: number; isTransfer: boolean; walkSeconds?: number }> {
  const st = STATIONS_BY_ID.get(stationId);
  if (!st) return [];

  const neighbors: Array<{ stationId: string; time: number; isTransfer: boolean; walkSeconds?: number }> = [];

  // Adjacent stations on same line
  for (const adj of st.adjacent) {
    if (STATIONS_BY_ID.has(adj.stationId)) {
      neighbors.push({ stationId: adj.stationId, time: adj.time, isTransfer: false });
    }
  }

  // Transfer stations (different line, same physical station)
  for (const transferId of st.transfers) {
    if (STATIONS_BY_ID.has(transferId)) {
      const transferSt = STATIONS_BY_ID.get(transferId)!;
      const walkSec = getTransferWalkSeconds(st.line, transferSt.line);
      const walkMin = Math.ceil(walkSec / 60);
      neighbors.push({
        stationId: transferId,
        time: walkMin,
        isTransfer: true,
        walkSeconds: walkSec,
      });
    }
  }

  // Branch transfers (same line, platform change at junction)
  if (st.branchTransfers) {
    for (const btId of st.branchTransfers) {
      if (STATIONS_BY_ID.has(btId)) {
        neighbors.push({
          stationId: btId,
          time: 1,
          isTransfer: true,
          walkSeconds: 60,
        });
      }
    }
  }

  return neighbors;
}

// ─── Dijkstra shortest path ───────────────────────────────────────────────────
function dijkstra(
  startIds: string[],
  endIds: Set<string>,
  realtimeWaits: Map<string, number> = new Map()
): GraphNode | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  // Min-heap (simplified with array + sort for correctness)
  const queue: GraphNode[] = [];

  for (const id of startIds) {
    queue.push({ stationId: id, cost: 0, path: [id], transfers: 0, waitMinutes: 0 });
    dist.set(id, 0);
  }

  while (queue.length > 0) {
    // Get min cost node
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    if (visited.has(current.stationId)) continue;
    visited.add(current.stationId);

    if (endIds.has(current.stationId)) {
      return current;
    }

    const neighbors = getNeighbors(current.stationId);
    for (const nb of neighbors) {
      if (visited.has(nb.stationId)) continue;

      const currentSt = STATIONS_BY_ID.get(current.stationId)!;
      const nbSt = STATIONS_BY_ID.get(nb.stationId);
      if (!nbSt) continue;

      let additionalCost = nb.time;
      let waitMin = 0;

      if (nb.isTransfer) {
        // After walking to the transfer platform, we need to wait for next train
        const realtimeKey = `${nb.stationId}`;
        if (realtimeWaits.has(realtimeKey)) {
          waitMin = realtimeWaits.get(realtimeKey)!;
        } else {
          waitMin = getLineHeadway(nbSt.line) / 2; // average wait = half headway
        }
        additionalCost += waitMin;
      }

      const newCost = current.cost + additionalCost;
      if (!dist.has(nb.stationId) || newCost < dist.get(nb.stationId)!) {
        dist.set(nb.stationId, newCost);
        const newTransfers = nb.isTransfer ? current.transfers + 1 : current.transfers;
        queue.push({
          stationId: nb.stationId,
          cost: newCost,
          path: [...current.path, nb.stationId],
          transfers: newTransfers,
          waitMinutes: current.waitMinutes + waitMin,
        });
      }
    }
  }

  return null;
}

// ─── Yen's K-Shortest Paths ───────────────────────────────────────────────────
function yenKShortest(
  startIds: string[],
  endIds: Set<string>,
  K: number,
  realtimeWaits: Map<string, number>
): GraphNode[] {
  const results: GraphNode[] = [];
  const candidates: GraphNode[] = [];

  // First shortest path
  const first = dijkstra(startIds, endIds, realtimeWaits);
  if (!first) return results;
  results.push(first);

  for (let k = 1; k < K; k++) {
    const prevPath = results[k - 1].path;

    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i];
      const rootPath = prevPath.slice(0, i + 1);

      // Temporarily remove edges used by previous shortest paths
      const removedEdges = new Set<string>();
      for (const res of results) {
        if (
          res.path.length > i &&
          JSON.stringify(res.path.slice(0, i + 1)) === JSON.stringify(rootPath)
        ) {
          const edgeKey = `${res.path[i]}->${res.path[i + 1]}`;
          removedEdges.add(edgeKey);
        }
      }

      // Find spur path from spurNode to destination, avoiding removed edges
      const spurResult = dijkstraWithExclusions(
        [spurNode],
        endIds,
        realtimeWaits,
        removedEdges,
        new Set(rootPath.slice(0, -1)) // exclude root nodes except spur
      );

      if (spurResult) {
        // Total path = root + spur
        const totalPath = [
          ...rootPath.slice(0, -1),
          ...spurResult.path,
        ];
        // Calculate cost
        const totalCost = calculatePathCost(totalPath, realtimeWaits);
        const totalTransfers = countTransfers(totalPath);

        const candidate: GraphNode = {
          stationId: totalPath[totalPath.length - 1],
          cost: totalCost,
          path: totalPath,
          transfers: totalTransfers,
          waitMinutes: 0,
        };

        // Avoid duplicates
        const pathKey = totalPath.join(",");
        const isDupe = [...results, ...candidates].some(
          (r) => r.path.join(",") === pathKey
        );
        if (!isDupe) {
          candidates.push(candidate);
        }
      }
    }

    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.cost - b.cost);
    results.push(candidates.shift()!);
  }

  return results;
}

function dijkstraWithExclusions(
  startIds: string[],
  endIds: Set<string>,
  realtimeWaits: Map<string, number>,
  excludedEdges: Set<string>,
  excludedNodes: Set<string>
): GraphNode | null {
  const dist = new Map<string, number>();
  const visited = new Set<string>();
  const queue: GraphNode[] = [];

  for (const id of startIds) {
    if (!excludedNodes.has(id)) {
      queue.push({ stationId: id, cost: 0, path: [id], transfers: 0, waitMinutes: 0 });
      dist.set(id, 0);
    }
  }

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (visited.has(current.stationId)) continue;
    visited.add(current.stationId);

    if (endIds.has(current.stationId)) return current;

    const neighbors = getNeighbors(current.stationId);
    for (const nb of neighbors) {
      const edgeKey = `${current.stationId}->${nb.stationId}`;
      if (visited.has(nb.stationId)) continue;
      if (excludedEdges.has(edgeKey)) continue;
      if (excludedNodes.has(nb.stationId) && !endIds.has(nb.stationId)) continue;

      const nbSt = STATIONS_BY_ID.get(nb.stationId);
      if (!nbSt) continue;

      let additionalCost = nb.time;
      let waitMin = 0;
      if (nb.isTransfer) {
        const realtimeKey = nb.stationId;
        waitMin = realtimeWaits.get(realtimeKey) ?? getLineHeadway(nbSt.line) / 2;
        additionalCost += waitMin;
      }

      const newCost = current.cost + additionalCost;
      if (!dist.has(nb.stationId) || newCost < dist.get(nb.stationId)!) {
        dist.set(nb.stationId, newCost);
        queue.push({
          stationId: nb.stationId,
          cost: newCost,
          path: [...current.path, nb.stationId],
          transfers: nb.isTransfer ? current.transfers + 1 : current.transfers,
          waitMinutes: current.waitMinutes + waitMin,
        });
      }
    }
  }

  return null;
}

function calculatePathCost(
  path: string[],
  realtimeWaits: Map<string, number>
): number {
  let cost = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = STATIONS_BY_ID.get(path[i]);
    const to = STATIONS_BY_ID.get(path[i + 1]);
    if (!from || !to) continue;

    // Find the edge
    const adj = from.adjacent.find((a) => a.stationId === path[i + 1]);
    if (adj) {
      cost += adj.time;
    } else {
      // It's a transfer
      const walkSec = getTransferWalkSeconds(from.line, to.line);
      const walkMin = Math.ceil(walkSec / 60);
      const waitMin = realtimeWaits.get(path[i + 1]) ?? getLineHeadway(to.line) / 2;
      cost += walkMin + waitMin;
    }
  }
  return cost;
}

function countTransfers(path: string[]): number {
  let transfers = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = STATIONS_BY_ID.get(path[i - 1]);
    const curr = STATIONS_BY_ID.get(path[i]);
    if (prev && curr && prev.line !== curr.line) {
      transfers++;
    }
  }
  return transfers;
}

// ─── Convert path to Route Segments ──────────────────────────────────────────
function pathToRoute(
  path: string[],
  realtimeWaits: Map<string, number>,
  realtimeArrivals: Map<string, RealtimeArrival[]>
): Route | null {
  if (path.length < 2) return null;

  const segments: RouteSegment[] = [];
  let segStart = 0;
  let totalMinutes = 0;

  // Group consecutive same-line stations into segments
  for (let i = 1; i <= path.length; i++) {
    const prevSt = STATIONS_BY_ID.get(path[i - 1]);
    const currSt = i < path.length ? STATIONS_BY_ID.get(path[i]) : null;

    const isLineChange = currSt
      ? prevSt?.line !== currSt.line
      : true;

    if (isLineChange || i === path.length) {
      // Build segment from segStart to i-1
      const segPath = path.slice(segStart, i);
      if (segPath.length < 2) {
        segStart = i - 1;
        continue;
      }

      const fromSt = STATIONS_BY_ID.get(segPath[0])!;
      const toSt = STATIONS_BY_ID.get(segPath[segPath.length - 1])!;
      const stops = segPath.slice(1, -1).map((id) => STATIONS_BY_ID.get(id)!).filter(Boolean);

      // Calculate segment travel time
      let segTime = 0;
      for (let j = 0; j < segPath.length - 1; j++) {
        const a = STATIONS_BY_ID.get(segPath[j]);
        const b = STATIONS_BY_ID.get(segPath[j + 1]);
        if (a && b) {
          const adj = a.adjacent.find((x) => x.stationId === segPath[j + 1]);
          if (adj) segTime += adj.time;
        }
      }

      // Get realtime departure info for start of segment
      let realtimeDepartureMin: number | undefined;
      let waitMinutes: number | undefined;

      const arrivals = realtimeArrivals.get(fromSt.name);
      if (arrivals && arrivals.length > 0) {
        // Find matching train going in right direction
        const matching = arrivals.find(
          (a) => a.subwayId === fromSt.line || a.line === fromSt.line
        );
        if (matching) {
          realtimeDepartureMin = matching.arrivalMinutes;
          waitMinutes = matching.arrivalMinutes;
        }
      }

      // Determine direction (last station of line)
      const direction = getLineDirection(fromSt.line, toSt.id);

      // Transfer walk time (for non-first segments)
      let walkSeconds: number | undefined;
      if (segStart > 0) {
        const prevSegLastSt = STATIONS_BY_ID.get(path[segStart]);
        if (prevSegLastSt) {
          walkSeconds = getTransferWalkSeconds(prevSegLastSt.line, fromSt.line);
        }
      }

      // Wait time at this transfer
      if (segStart > 0) {
        const waitKey = fromSt.id;
        const wait = realtimeWaits.get(waitKey) ?? getLineHeadway(fromSt.line) / 2;
        waitMinutes = wait;
      }

      segments.push({
        line: fromSt.line,
        lineColor: fromSt.lineColor,
        direction,
        fromStation: fromSt,
        toStation: toSt,
        stops,
        realtimeDepartureMin,
        walkSeconds,
        waitMinutes: segStart > 0 ? waitMinutes : undefined,
      });

      totalMinutes += segTime;
      if (segStart > 0 && waitMinutes !== undefined) {
        totalMinutes += waitMinutes;
      }

      segStart = i - 1;
    }
  }

  if (segments.length === 0) return null;

  const firstSt = STATIONS_BY_ID.get(path[0])!;
  const lastSt = STATIONS_BY_ID.get(path[path.length - 1])!;
  const transferCount = countTransfers(path);

  // Calculate fare based on distance (simplified)
  const stationCount = path.length;
  const cost = calculateFare(stationCount);

  return {
    totalMinutes: Math.round(totalMinutes),
    transferCount,
    stationCount,
    cost,
    segments,
  };
}

function getLineDirection(line: string, toStationId: string): string {
  // Simplified direction based on destination
  const toSt = STATIONS_BY_ID.get(toStationId);
  if (!toSt) return "";

  const directionMap: Record<string, string[]> = {
    "1": ["소요산행", "신창행"],
    "2": ["순환"],
    "3": ["대화행", "오금행"],
    "4": ["진접행", "오이도행"],
    "5": ["방화행", "하남검단산행", "마천행"],
    "6": ["응암순환"],
    "7": ["장암행", "석남행"],
    "8": ["암사행", "모란행"],
    "9": ["개화행", "중앙보훈병원행"],
  };

  const dirs = directionMap[line];
  if (!dirs) return `${toSt.name}행`;
  return dirs[dirs.length - 1]; // simplified
}

function calculateFare(stationCount: number): number {
  // Seoul Metro basic fare structure (2024)
  if (stationCount <= 10) return 1400;
  if (stationCount <= 40) return 1400 + Math.ceil((stationCount - 10) / 5) * 100;
  return 1400 + Math.ceil(30 / 5) * 100 + Math.ceil((stationCount - 40) / 10) * 100;
}

// ─── Main Route Finder ────────────────────────────────────────────────────────
export interface FindRouteOptions {
  from: string; // Station name in Korean
  to: string;   // Station name in Korean
  realtimeArrivals?: Map<string, RealtimeArrival[]>; // station name -> arrivals
}

export function findRoutes(options: FindRouteOptions): Route[] {
  const { from, to, realtimeArrivals = new Map<string, RealtimeArrival[]>() } = options;

  const fromStations = STATIONS_BY_NAME.get(from) || [];
  const toStations = STATIONS_BY_NAME.get(to) || [];

  if (fromStations.length === 0 || toStations.length === 0) {
    return [];
  }

  const startIds = fromStations.map((s) => s.id);
  const endIds = new Set(toStations.map((s) => s.id));

  // Build realtime wait map from arrivals
  const realtimeWaits = new Map<string, number>();
  for (const [stationName, arrivals] of realtimeArrivals.entries()) {
    const stations = STATIONS_BY_NAME.get(stationName) || [];
    for (const st of stations) {
      // Find the earliest arrival for this line
      const lineArrivals = arrivals.filter(
        (a) => a.subwayId === st.line || a.line === st.line
      );
      if (lineArrivals.length > 0) {
        lineArrivals.sort((a, b) => a.arrivalMinutes - b.arrivalMinutes);
        realtimeWaits.set(st.id, lineArrivals[0].arrivalMinutes);
      }
    }
  }

  // Find K shortest paths
  const kPaths = yenKShortest(startIds, endIds, 5, realtimeWaits);

  // Convert to routes
  const routes: Route[] = [];
  for (const graphNode of kPaths) {
    const route = pathToRoute(graphNode.path, realtimeWaits, realtimeArrivals);
    if (route) {
      routes.push(route);
    }
  }

  // Sort by total time
  routes.sort((a, b) => a.totalMinutes - b.totalMinutes);

  // Label routes
  if (routes.length > 0) {
    routes[0].label = "최단시간";
  }

  // Find minimum transfer route
  const minTransfer = [...routes].sort((a, b) => a.transferCount - b.transferCount)[0];
  if (minTransfer && minTransfer !== routes[0]) {
    minTransfer.label = "최소환승";
  } else if (routes.length > 1 && !routes[1].label) {
    routes[1].label = "최소환승";
  }

  // Find minimum cost route (usually fewer stations)
  const minCost = [...routes].sort((a, b) => a.cost - b.cost)[0];
  if (minCost && !minCost.label) {
    minCost.label = "최소비용";
  } else if (routes.length > 2 && !routes[2].label) {
    routes[2].label = "최소비용";
  }

  return routes;
}
