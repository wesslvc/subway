"use client";

interface LinesBadgeProps {
  lineName: string;
  lineColor: string;
  className?: string;
}

export default function LineBadge({ lineName, lineColor, className = "" }: LinesBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-white text-xs font-bold ${className}`}
      style={{ backgroundColor: lineColor }}
    >
      {lineName}
    </span>
  );
}
