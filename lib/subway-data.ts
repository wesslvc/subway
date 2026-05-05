import { Station } from "@/types/subway";

export const LINE_COLORS: Record<string, string> = {
  "1": "#0052A4",
  "2": "#00A84D",
  "3": "#EF7C1C",
  "4": "#00A4E3",
  "5": "#996CAC",
  "6": "#CD7C2F",
  "7": "#747F00",
  "8": "#E6186C",
  "9": "#BDB092",
  "경의중앙": "#77C4A3",
  "공항": "#4EA0D1",
  "수인분당": "#FABE00",
};

// Helper to create station ID
function sid(name: string, line: string): string {
  return `${line}-${name}`;
}

function s(
  name: string,
  nameEn: string,
  line: string,
  transfers: string[] = [],
  adjacent: Array<{ stationId: string; time: number }> = [],
  branchTransfers?: string[]
): Station {
  return {
    id: sid(name, line),
    name,
    nameEn,
    line,
    lineColor: LINE_COLORS[line] || "#888888",
    transfers,
    branchTransfers,
    adjacent,
  };
}

// ─── LINE 1 ──────────────────────────────────────────────────────────────────
const line1Stations: Station[] = [
  s("소요산", "Soyosan", "1", [], [{ stationId: "1-동두천", time: 5 }]),
  s("동두천", "Dongducheon", "1", [], [{ stationId: "1-소요산", time: 5 }, { stationId: "1-보산", time: 3 }]),
  s("보산", "Bosan", "1", [], [{ stationId: "1-동두천", time: 3 }, { stationId: "1-동두천중앙", time: 2 }]),
  s("동두천중앙", "Dongducheon-jungang", "1", [], [{ stationId: "1-보산", time: 2 }, { stationId: "1-지행", time: 2 }]),
  s("지행", "Jihang", "1", [], [{ stationId: "1-동두천중앙", time: 2 }, { stationId: "1-덕정", time: 3 }]),
  s("덕정", "Deokjeong", "1", [], [{ stationId: "1-지행", time: 3 }, { stationId: "1-덕계", time: 2 }]),
  s("덕계", "Deokgye", "1", [], [{ stationId: "1-덕정", time: 2 }, { stationId: "1-양주", time: 3 }]),
  s("양주", "Yangju", "1", [], [{ stationId: "1-덕계", time: 3 }, { stationId: "1-녹양", time: 3 }]),
  s("녹양", "Nogyang", "1", [], [{ stationId: "1-양주", time: 3 }, { stationId: "1-가능", time: 2 }]),
  s("가능", "Ganeung", "1", [], [{ stationId: "1-녹양", time: 2 }, { stationId: "1-의정부", time: 2 }]),
  s("의정부", "Uijeongbu", "1", [], [{ stationId: "1-가능", time: 2 }, { stationId: "1-회룡", time: 3 }]),
  s("회룡", "Hoeryong", "1", [], [{ stationId: "1-의정부", time: 3 }, { stationId: "1-망월사", time: 2 }]),
  s("망월사", "Mangwolsa", "1", [], [{ stationId: "1-회룡", time: 2 }, { stationId: "1-도봉산", time: 2 }]),
  s("도봉산", "Dobongsan", "1", ["7-도봉산"], [{ stationId: "1-망월사", time: 2 }, { stationId: "1-도봉", time: 2 }]),
  s("도봉", "Dobong", "1", [], [{ stationId: "1-도봉산", time: 2 }, { stationId: "1-방학", time: 2 }]),
  s("방학", "Banghak", "1", [], [{ stationId: "1-도봉", time: 2 }, { stationId: "1-창동", time: 2 }]),
  s("창동", "Changdong", "1", ["4-창동"], [{ stationId: "1-방학", time: 2 }, { stationId: "1-녹천", time: 2 }]),
  s("녹천", "Nokcheon", "1", [], [{ stationId: "1-창동", time: 2 }, { stationId: "1-월계", time: 2 }]),
  s("월계", "Wolgye", "1", [], [{ stationId: "1-녹천", time: 2 }, { stationId: "1-광운대", time: 2 }]),
  s("광운대", "Gwangun Univ.", "1", [], [{ stationId: "1-월계", time: 2 }, { stationId: "1-석계", time: 2 }]),
  s("석계", "Seokgye", "1", ["6-석계"], [{ stationId: "1-광운대", time: 2 }, { stationId: "1-신이문", time: 2 }]),
  s("신이문", "Sinimun", "1", [], [{ stationId: "1-석계", time: 2 }, { stationId: "1-외대앞", time: 2 }]),
  s("외대앞", "Hankuk Univ. of Foreign Studies", "1", [], [{ stationId: "1-신이문", time: 2 }, { stationId: "1-회기", time: 2 }]),
  s("회기", "Hoegi", "1", [], [{ stationId: "1-외대앞", time: 2 }, { stationId: "1-청량리", time: 2 }]),
  s("청량리", "Cheongnyangni", "1", [], [{ stationId: "1-회기", time: 2 }, { stationId: "1-제기동", time: 2 }]),
  s("제기동", "Jegi-dong", "1", [], [{ stationId: "1-청량리", time: 2 }, { stationId: "1-신설동", time: 2 }]),
  s("신설동", "Sinseol-dong", "1", ["2-신설동"], [{ stationId: "1-제기동", time: 2 }, { stationId: "1-동묘앞", time: 2 }]),
  s("동묘앞", "Dongmyo", "1", ["6-동묘앞"], [{ stationId: "1-신설동", time: 2 }, { stationId: "1-동대문", time: 2 }]),
  s("동대문", "Dongdaemun", "1", ["4-동대문"], [{ stationId: "1-동묘앞", time: 2 }, { stationId: "1-종로5가", time: 2 }]),
  s("종로5가", "Jongno 5(o)-ga", "1", [], [{ stationId: "1-동대문", time: 2 }, { stationId: "1-종로3가", time: 2 }]),
  s("종로3가", "Jongno 3(sam)-ga", "1", ["3-종로3가", "5-종로3가"], [{ stationId: "1-종로5가", time: 2 }, { stationId: "1-종각", time: 2 }]),
  s("종각", "Jonggak", "1", [], [{ stationId: "1-종로3가", time: 2 }, { stationId: "1-시청", time: 2 }]),
  s("시청", "City Hall", "1", ["2-시청"], [{ stationId: "1-종각", time: 2 }, { stationId: "1-서울역", time: 2 }]),
  s("서울역", "Seoul Station", "1", ["4-서울역"], [{ stationId: "1-시청", time: 2 }, { stationId: "1-남영", time: 2 }]),
  s("남영", "Namyeong", "1", [], [{ stationId: "1-서울역", time: 2 }, { stationId: "1-용산", time: 2 }]),
  s("용산", "Yongsan", "1", [], [{ stationId: "1-남영", time: 2 }, { stationId: "1-노량진", time: 3 }]),
  s("노량진", "Noryangjin", "1", ["9-노량진"], [{ stationId: "1-용산", time: 3 }, { stationId: "1-대방", time: 2 }]),
  s("대방", "Daebang", "1", [], [{ stationId: "1-노량진", time: 2 }, { stationId: "1-신길", time: 2 }]),
  s("신길", "Singil", "1", ["5-신길"], [{ stationId: "1-대방", time: 2 }, { stationId: "1-영등포", time: 2 }]),
  s("영등포", "Yeongdeungpo", "1", [], [{ stationId: "1-신길", time: 2 }, { stationId: "1-신도림", time: 3 }]),
  s("신도림", "Sindorim", "1", ["2-신도림"], [{ stationId: "1-영등포", time: 3 }, { stationId: "1-구로", time: 2 }]),
  s("구로", "Guro", "1", [], [{ stationId: "1-신도림", time: 2 }, { stationId: "1-가산디지털단지", time: 3 }]),
  s("가산디지털단지", "Gasan Digital Complex", "1", ["7-가산디지털단지"], [{ stationId: "1-구로", time: 3 }, { stationId: "1-독산", time: 2 }]),
  s("독산", "Doksan", "1", [], [{ stationId: "1-가산디지털단지", time: 2 }, { stationId: "1-금천구청", time: 2 }]),
  s("금천구청", "Geumcheon-gu Office", "1", [], [{ stationId: "1-독산", time: 2 }, { stationId: "1-석수", time: 3 }]),
  s("석수", "Seoksu", "1", [], [{ stationId: "1-금천구청", time: 3 }, { stationId: "1-관악", time: 2 }]),
  s("관악", "Gwanak", "1", [], [{ stationId: "1-석수", time: 2 }, { stationId: "1-안양", time: 2 }]),
  s("안양", "Anyang", "1", [], [{ stationId: "1-관악", time: 2 }, { stationId: "1-명학", time: 2 }]),
  s("명학", "Myeonghak", "1", [], [{ stationId: "1-안양", time: 2 }, { stationId: "1-금정", time: 2 }]),
  s("금정", "Geumjeong", "1", ["4-금정"], [{ stationId: "1-명학", time: 2 }, { stationId: "1-군포", time: 2 }]),
  s("군포", "Gunpo", "1", [], [{ stationId: "1-금정", time: 2 }, { stationId: "1-의왕", time: 2 }]),
  s("의왕", "Uiwang", "1", [], [{ stationId: "1-군포", time: 2 }, { stationId: "1-성균관대", time: 3 }]),
  s("성균관대", "Sungkyunkwan Univ.", "1", [], [{ stationId: "1-의왕", time: 3 }, { stationId: "1-화서", time: 2 }]),
  s("화서", "Hwaseo", "1", [], [{ stationId: "1-성균관대", time: 2 }, { stationId: "1-수원", time: 2 }]),
  s("수원", "Suwon", "1", [], [{ stationId: "1-화서", time: 2 }, { stationId: "1-세류", time: 2 }]),
  s("세류", "Seryu", "1", [], [{ stationId: "1-수원", time: 2 }, { stationId: "1-병점", time: 4 }]),
  s("병점", "Byeongjeom", "1", [], [{ stationId: "1-세류", time: 4 }, { stationId: "1-세마", time: 3 }]),
  s("세마", "Sema", "1", [], [{ stationId: "1-병점", time: 3 }, { stationId: "1-오산대", time: 3 }]),
  s("오산대", "Osan Univ.", "1", [], [{ stationId: "1-세마", time: 3 }, { stationId: "1-오산", time: 2 }]),
  s("오산", "Osan", "1", [], [{ stationId: "1-오산대", time: 2 }, { stationId: "1-진위", time: 3 }]),
  s("진위", "Jinwi", "1", [], [{ stationId: "1-오산", time: 3 }, { stationId: "1-송탄", time: 3 }]),
  s("송탄", "Songtan", "1", [], [{ stationId: "1-진위", time: 3 }, { stationId: "1-서정리", time: 2 }]),
  s("서정리", "Seojeongni", "1", [], [{ stationId: "1-송탄", time: 2 }, { stationId: "1-지제", time: 3 }]),
  s("지제", "Jije", "1", [], [{ stationId: "1-서정리", time: 3 }, { stationId: "1-평택", time: 3 }]),
  s("평택", "Pyeongtaek", "1", [], [{ stationId: "1-지제", time: 3 }, { stationId: "1-성환", time: 6 }]),
  s("성환", "Seonghwan", "1", [], [{ stationId: "1-평택", time: 6 }, { stationId: "1-천안", time: 5 }]),
  s("천안", "Cheonan", "1", [], [{ stationId: "1-성환", time: 5 }, { stationId: "1-두정", time: 3 }]),
  s("두정", "Dujeong", "1", [], [{ stationId: "1-천안", time: 3 }, { stationId: "1-직산", time: 3 }]),
  s("직산", "Jiksan", "1", [], [{ stationId: "1-두정", time: 3 }, { stationId: "1-신창", time: 5 }]),
  s("신창", "Sinchang", "1", [], [{ stationId: "1-직산", time: 5 }]),
];

// ─── LINE 2 (Circular) ───────────────────────────────────────────────────────
const line2Stations: Station[] = [
  s("시청", "City Hall", "2", ["1-시청"], [{ stationId: "2-을지로입구", time: 1 }, { stationId: "2-충정로", time: 2 }]),
  s("을지로입구", "Euljiro 1(il)-ga", "2", [], [{ stationId: "2-시청", time: 1 }, { stationId: "2-을지로3가", time: 1 }]),
  s("을지로3가", "Euljiro 3(sam)-ga", "2", ["3-을지로3가"], [{ stationId: "2-을지로입구", time: 1 }, { stationId: "2-을지로4가", time: 1 }]),
  s("을지로4가", "Euljiro 4(sa)-ga", "2", ["5-을지로4가"], [{ stationId: "2-을지로3가", time: 1 }, { stationId: "2-동대문역사문화공원", time: 2 }]),
  s("동대문역사문화공원", "Dongdaemun History & Culture Park", "2", ["4-동대문역사문화공원", "5-동대문역사문화공원"], [{ stationId: "2-을지로4가", time: 2 }, { stationId: "2-신당", time: 2 }]),
  s("신당", "Sindang", "2", ["6-신당"], [{ stationId: "2-동대문역사문화공원", time: 2 }, { stationId: "2-상왕십리", time: 2 }]),
  s("상왕십리", "Sangwangsimni", "2", [], [{ stationId: "2-신당", time: 2 }, { stationId: "2-왕십리", time: 2 }]),
  s("왕십리", "Wangsimni", "2", ["5-왕십리"], [{ stationId: "2-상왕십리", time: 2 }, { stationId: "2-한양대", time: 2 }]),
  s("한양대", "Hanyang Univ.", "2", [], [{ stationId: "2-왕십리", time: 2 }, { stationId: "2-뚝섬", time: 2 }]),
  s("뚝섬", "Ttukseom", "2", [], [{ stationId: "2-한양대", time: 2 }, { stationId: "2-성수", time: 2 }]),
  s("성수", "Seongsu", "2", [], [{ stationId: "2-뚝섬", time: 2 }, { stationId: "2-건대입구", time: 3 }, { stationId: "2-용답", time: 2 }]),
  s("건대입구", "Konkuk Univ.", "2", ["7-건대입구"], [{ stationId: "2-성수", time: 3 }, { stationId: "2-구의", time: 2 }]),
  s("구의", "Guui", "2", [], [{ stationId: "2-건대입구", time: 2 }, { stationId: "2-강변", time: 2 }]),
  s("강변", "Gangbyeon", "2", [], [{ stationId: "2-구의", time: 2 }, { stationId: "2-잠실나루", time: 2 }]),
  s("잠실나루", "Jamsil Naru", "2", [], [{ stationId: "2-강변", time: 2 }, { stationId: "2-잠실", time: 2 }]),
  s("잠실", "Jamsil", "2", ["8-잠실"], [{ stationId: "2-잠실나루", time: 2 }, { stationId: "2-잠실새내", time: 2 }]),
  s("잠실새내", "Jamsil Saenae", "2", [], [{ stationId: "2-잠실", time: 2 }, { stationId: "2-종합운동장", time: 2 }]),
  s("종합운동장", "Sports Complex", "2", ["9-종합운동장"], [{ stationId: "2-잠실새내", time: 2 }, { stationId: "2-삼성", time: 2 }]),
  s("삼성", "Samseong", "2", ["9-삼성중앙"], [{ stationId: "2-종합운동장", time: 2 }, { stationId: "2-선릉", time: 2 }]),
  s("선릉", "Seolleung", "2", [], [{ stationId: "2-삼성", time: 2 }, { stationId: "2-역삼", time: 2 }]),
  s("역삼", "Yeoksam", "2", [], [{ stationId: "2-선릉", time: 2 }, { stationId: "2-강남", time: 2 }]),
  s("강남", "Gangnam", "2", [], [{ stationId: "2-역삼", time: 2 }, { stationId: "2-교대", time: 2 }]),
  s("교대", "Seoul Nat'l Univ. of Education", "2", ["3-교대"], [{ stationId: "2-강남", time: 2 }, { stationId: "2-서초", time: 2 }]),
  s("서초", "Seocho", "2", [], [{ stationId: "2-교대", time: 2 }, { stationId: "2-방배", time: 2 }]),
  s("방배", "Bangbae", "2", [], [{ stationId: "2-서초", time: 2 }, { stationId: "2-사당", time: 2 }]),
  s("사당", "Sadang", "2", ["4-사당"], [{ stationId: "2-방배", time: 2 }, { stationId: "2-낙성대", time: 3 }]),
  s("낙성대", "Nakseongdae", "2", [], [{ stationId: "2-사당", time: 3 }, { stationId: "2-서울대입구", time: 2 }]),
  s("서울대입구", "Seoul Nat'l Univ.", "2", [], [{ stationId: "2-낙성대", time: 2 }, { stationId: "2-봉천", time: 2 }]),
  s("봉천", "Bongcheon", "2", [], [{ stationId: "2-서울대입구", time: 2 }, { stationId: "2-신림", time: 3 }]),
  s("신림", "Sillim", "2", [], [{ stationId: "2-봉천", time: 3 }, { stationId: "2-신대방", time: 2 }]),
  s("신대방", "Sindaebang", "2", [], [{ stationId: "2-신림", time: 2 }, { stationId: "2-구로디지털단지", time: 2 }]),
  s("구로디지털단지", "Guro Digital Complex", "2", [], [{ stationId: "2-신대방", time: 2 }, { stationId: "2-대림", time: 2 }]),
  s("대림", "Daerim", "2", ["7-대림"], [{ stationId: "2-구로디지털단지", time: 2 }, { stationId: "2-신도림", time: 3 }]),
  s("신도림", "Sindorim", "2", ["1-신도림"], [{ stationId: "2-대림", time: 3 }, { stationId: "2-문래", time: 2 }, { stationId: "2-도림천", time: 2 }]),
  s("문래", "Mullae", "2", [], [{ stationId: "2-신도림", time: 2 }, { stationId: "2-영등포구청", time: 2 }]),
  s("영등포구청", "Yeongdeungpo-gu Office", "2", ["5-영등포구청"], [{ stationId: "2-문래", time: 2 }, { stationId: "2-당산", time: 2 }]),
  s("당산", "Dangsan", "2", ["9-당산"], [{ stationId: "2-영등포구청", time: 2 }, { stationId: "2-합정", time: 2 }]),
  s("합정", "Hapjeong", "2", ["6-합정"], [{ stationId: "2-당산", time: 2 }, { stationId: "2-홍대입구", time: 2 }]),
  s("홍대입구", "Hongik Univ.", "2", [], [{ stationId: "2-합정", time: 2 }, { stationId: "2-신촌", time: 3 }]),
  s("신촌", "Sinchon", "2", [], [{ stationId: "2-홍대입구", time: 3 }, { stationId: "2-이대", time: 2 }]),
  s("이대", "Ewha Womans Univ.", "2", [], [{ stationId: "2-신촌", time: 2 }, { stationId: "2-아현", time: 2 }]),
  s("아현", "Ahyeon", "2", [], [{ stationId: "2-이대", time: 2 }, { stationId: "2-충정로", time: 2 }]),
  s("충정로", "Chungjeongno", "2", ["5-충정로"], [{ stationId: "2-아현", time: 2 }, { stationId: "2-시청", time: 2 }]),
  // Seongsu branch
  s("용답", "Yongdap", "2", [], [{ stationId: "2-성수", time: 2 }, { stationId: "2-신답", time: 2 }]),
  s("신답", "Sindap", "2", [], [{ stationId: "2-용답", time: 2 }, { stationId: "2-용두", time: 2 }]),
  s("용두", "Yongdu", "2", [], [{ stationId: "2-신답", time: 2 }, { stationId: "2-신설동", time: 2 }]),
  s("신설동", "Sinseol-dong", "2", ["1-신설동"], [{ stationId: "2-용두", time: 2 }]),
  // Sinjeong branch
  s("도림천", "Dorimcheon", "2", [], [{ stationId: "2-신도림", time: 2 }, { stationId: "2-양천구청", time: 2 }]),
  s("양천구청", "Yangcheon-gu Office", "2", [], [{ stationId: "2-도림천", time: 2 }, { stationId: "2-신정네거리", time: 2 }]),
  s("신정네거리", "Sinjeong Intersection", "2", [], [{ stationId: "2-양천구청", time: 2 }, { stationId: "2-까치산", time: 2 }]),
  s("까치산", "Kkachisan", "2", ["5-까치산"], [{ stationId: "2-신정네거리", time: 2 }]),
];

// ─── LINE 3 ──────────────────────────────────────────────────────────────────
const line3Stations: Station[] = [
  s("대화", "Daehwa", "3", [], [{ stationId: "3-주엽", time: 2 }]),
  s("주엽", "Juyeop", "3", [], [{ stationId: "3-대화", time: 2 }, { stationId: "3-정발산", time: 2 }]),
  s("정발산", "Jeongbalsan", "3", [], [{ stationId: "3-주엽", time: 2 }, { stationId: "3-마두", time: 2 }]),
  s("마두", "Madu", "3", [], [{ stationId: "3-정발산", time: 2 }, { stationId: "3-백석", time: 2 }]),
  s("백석", "Baekseok", "3", [], [{ stationId: "3-마두", time: 2 }, { stationId: "3-대곡", time: 3 }]),
  s("대곡", "Daegok", "3", [], [{ stationId: "3-백석", time: 3 }, { stationId: "3-화정", time: 2 }]),
  s("화정", "Hwajeong", "3", [], [{ stationId: "3-대곡", time: 2 }, { stationId: "3-원당", time: 2 }]),
  s("원당", "Wondang", "3", [], [{ stationId: "3-화정", time: 2 }, { stationId: "3-원흥", time: 2 }]),
  s("원흥", "Wonheung", "3", [], [{ stationId: "3-원당", time: 2 }, { stationId: "3-삼송", time: 2 }]),
  s("삼송", "Samsong", "3", [], [{ stationId: "3-원흥", time: 2 }, { stationId: "3-지축", time: 2 }]),
  s("지축", "Jichuk", "3", [], [{ stationId: "3-삼송", time: 2 }, { stationId: "3-구파발", time: 3 }]),
  s("구파발", "Gupabal", "3", [], [{ stationId: "3-지축", time: 3 }, { stationId: "3-연신내", time: 2 }]),
  s("연신내", "Yeonsinnae", "3", [], [{ stationId: "3-구파발", time: 2 }, { stationId: "3-불광", time: 2 }]),
  s("불광", "Bulgwang", "3", [], [{ stationId: "3-연신내", time: 2 }, { stationId: "3-녹번", time: 2 }]),
  s("녹번", "Nokbeon", "3", [], [{ stationId: "3-불광", time: 2 }, { stationId: "3-홍제", time: 2 }]),
  s("홍제", "Hongjae", "3", [], [{ stationId: "3-녹번", time: 2 }, { stationId: "3-무악재", time: 2 }]),
  s("무악재", "Muakjae", "3", [], [{ stationId: "3-홍제", time: 2 }, { stationId: "3-독립문", time: 2 }]),
  s("독립문", "Dongnimmun", "3", [], [{ stationId: "3-무악재", time: 2 }, { stationId: "3-경복궁", time: 2 }]),
  s("경복궁", "Gyeongbokgung", "3", [], [{ stationId: "3-독립문", time: 2 }, { stationId: "3-안국", time: 2 }]),
  s("안국", "Anguk", "3", [], [{ stationId: "3-경복궁", time: 2 }, { stationId: "3-종로3가", time: 2 }]),
  s("종로3가", "Jongno 3(sam)-ga", "3", ["1-종로3가", "5-종로3가"], [{ stationId: "3-안국", time: 2 }, { stationId: "3-을지로3가", time: 2 }]),
  s("을지로3가", "Euljiro 3(sam)-ga", "3", ["2-을지로3가"], [{ stationId: "3-종로3가", time: 2 }, { stationId: "3-충무로", time: 2 }]),
  s("충무로", "Chungmuro", "3", ["4-충무로"], [{ stationId: "3-을지로3가", time: 2 }, { stationId: "3-동대입구", time: 2 }]),
  s("동대입구", "Dongdaemun", "3", [], [{ stationId: "3-충무로", time: 2 }, { stationId: "3-약수", time: 2 }]),
  s("약수", "Yaksu", "3", ["6-약수"], [{ stationId: "3-동대입구", time: 2 }, { stationId: "3-금호", time: 2 }]),
  s("금호", "Geumho", "3", [], [{ stationId: "3-약수", time: 2 }, { stationId: "3-옥수", time: 2 }]),
  s("옥수", "Oksu", "3", [], [{ stationId: "3-금호", time: 2 }, { stationId: "3-압구정", time: 2 }]),
  s("압구정", "Apgujeong", "3", [], [{ stationId: "3-옥수", time: 2 }, { stationId: "3-신사", time: 2 }]),
  s("신사", "Sinsa", "3", [], [{ stationId: "3-압구정", time: 2 }, { stationId: "3-잠원", time: 2 }]),
  s("잠원", "Jamwon", "3", [], [{ stationId: "3-신사", time: 2 }, { stationId: "3-고속터미널", time: 2 }]),
  s("고속터미널", "Express Bus Terminal", "3", ["7-고속터미널", "9-고속터미널"], [{ stationId: "3-잠원", time: 2 }, { stationId: "3-교대", time: 2 }]),
  s("교대", "Seoul Nat'l Univ. of Education", "3", ["2-교대"], [{ stationId: "3-고속터미널", time: 2 }, { stationId: "3-남부터미널", time: 2 }]),
  s("남부터미널", "Nambu Bus Terminal", "3", [], [{ stationId: "3-교대", time: 2 }, { stationId: "3-양재", time: 2 }]),
  s("양재", "Yangjae", "3", [], [{ stationId: "3-남부터미널", time: 2 }, { stationId: "3-매봉", time: 2 }]),
  s("매봉", "Maebong", "3", [], [{ stationId: "3-양재", time: 2 }, { stationId: "3-도곡", time: 2 }]),
  s("도곡", "Dogok", "3", [], [{ stationId: "3-매봉", time: 2 }, { stationId: "3-대치", time: 2 }]),
  s("대치", "Daechi", "3", [], [{ stationId: "3-도곡", time: 2 }, { stationId: "3-학여울", time: 2 }]),
  s("학여울", "Hangnyeoul", "3", [], [{ stationId: "3-대치", time: 2 }, { stationId: "3-대청", time: 2 }]),
  s("대청", "Daecheong", "3", [], [{ stationId: "3-학여울", time: 2 }, { stationId: "3-일원", time: 2 }]),
  s("일원", "Irwon", "3", [], [{ stationId: "3-대청", time: 2 }, { stationId: "3-수서", time: 2 }]),
  s("수서", "Suseo", "3", [], [{ stationId: "3-일원", time: 2 }, { stationId: "3-가락시장", time: 2 }]),
  s("가락시장", "Garak Market", "3", ["8-가락시장"], [{ stationId: "3-수서", time: 2 }, { stationId: "3-경찰병원", time: 2 }]),
  s("경찰병원", "Police Hospital", "3", [], [{ stationId: "3-가락시장", time: 2 }, { stationId: "3-오금", time: 2 }]),
  s("오금", "Ogeum", "3", ["5-오금"], [{ stationId: "3-경찰병원", time: 2 }]),
];

// ─── LINE 4 ──────────────────────────────────────────────────────────────────
const line4Stations: Station[] = [
  s("진접", "Jinjeop", "4", [], [{ stationId: "4-오남", time: 3 }]),
  s("오남", "Onam", "4", [], [{ stationId: "4-진접", time: 3 }, { stationId: "4-별내별가람", time: 3 }]),
  s("별내별가람", "Byeollae Byeolgaram", "4", [], [{ stationId: "4-오남", time: 3 }, { stationId: "4-당고개", time: 3 }]),
  s("당고개", "Danggogae", "4", [], [{ stationId: "4-별내별가람", time: 3 }, { stationId: "4-상계", time: 3 }]),
  s("상계", "Sanggye", "4", [], [{ stationId: "4-당고개", time: 3 }, { stationId: "4-노원", time: 2 }]),
  s("노원", "Nowon", "4", ["7-노원"], [{ stationId: "4-상계", time: 2 }, { stationId: "4-창동", time: 2 }]),
  s("창동", "Changdong", "4", ["1-창동"], [{ stationId: "4-노원", time: 2 }, { stationId: "4-쌍문", time: 2 }]),
  s("쌍문", "Ssangmun", "4", [], [{ stationId: "4-창동", time: 2 }, { stationId: "4-수유", time: 2 }]),
  s("수유", "Suyu", "4", [], [{ stationId: "4-쌍문", time: 2 }, { stationId: "4-미아", time: 2 }]),
  s("미아", "Mia", "4", [], [{ stationId: "4-수유", time: 2 }, { stationId: "4-미아사거리", time: 2 }]),
  s("미아사거리", "Mia Sageori", "4", [], [{ stationId: "4-미아", time: 2 }, { stationId: "4-길음", time: 2 }]),
  s("길음", "Gireum", "4", [], [{ stationId: "4-미아사거리", time: 2 }, { stationId: "4-성신여대입구", time: 2 }]),
  s("성신여대입구", "Sungshin Women's Univ.", "4", [], [{ stationId: "4-길음", time: 2 }, { stationId: "4-한성대입구", time: 2 }]),
  s("한성대입구", "Hansung Univ.", "4", [], [{ stationId: "4-성신여대입구", time: 2 }, { stationId: "4-혜화", time: 2 }]),
  s("혜화", "Hyehwa", "4", [], [{ stationId: "4-한성대입구", time: 2 }, { stationId: "4-동대문", time: 2 }]),
  s("동대문", "Dongdaemun", "4", ["1-동대문"], [{ stationId: "4-혜화", time: 2 }, { stationId: "4-동대문역사문화공원", time: 2 }]),
  s("동대문역사문화공원", "Dongdaemun History & Culture Park", "4", ["2-동대문역사문화공원", "5-동대문역사문화공원"], [{ stationId: "4-동대문", time: 2 }, { stationId: "4-충무로", time: 2 }]),
  s("충무로", "Chungmuro", "4", ["3-충무로"], [{ stationId: "4-동대문역사문화공원", time: 2 }, { stationId: "4-명동", time: 2 }]),
  s("명동", "Myeongdong", "4", [], [{ stationId: "4-충무로", time: 2 }, { stationId: "4-회현", time: 2 }]),
  s("회현", "Hoehyeon", "4", [], [{ stationId: "4-명동", time: 2 }, { stationId: "4-서울역", time: 2 }]),
  s("서울역", "Seoul Station", "4", ["1-서울역"], [{ stationId: "4-회현", time: 2 }, { stationId: "4-숙대입구", time: 2 }]),
  s("숙대입구", "Sookmyung Women's Univ.", "4", [], [{ stationId: "4-서울역", time: 2 }, { stationId: "4-삼각지", time: 2 }]),
  s("삼각지", "Samgakji", "4", ["6-삼각지"], [{ stationId: "4-숙대입구", time: 2 }, { stationId: "4-신용산", time: 2 }]),
  s("신용산", "Sin Yongsan", "4", [], [{ stationId: "4-삼각지", time: 2 }, { stationId: "4-이촌", time: 2 }]),
  s("이촌", "Ichon", "4", [], [{ stationId: "4-신용산", time: 2 }, { stationId: "4-동작", time: 3 }]),
  s("동작", "Dongjak", "4", ["9-동작"], [{ stationId: "4-이촌", time: 3 }, { stationId: "4-총신대입구", time: 2 }]),
  s("총신대입구", "Chongshin Univ.", "4", ["7-이수"], [{ stationId: "4-동작", time: 2 }, { stationId: "4-사당", time: 2 }]),
  s("사당", "Sadang", "4", ["2-사당"], [{ stationId: "4-총신대입구", time: 2 }, { stationId: "4-남태령", time: 2 }]),
  s("남태령", "Namtaeryeong", "4", [], [{ stationId: "4-사당", time: 2 }, { stationId: "4-선바위", time: 2 }]),
  s("선바위", "Seonbawi", "4", [], [{ stationId: "4-남태령", time: 2 }, { stationId: "4-경마공원", time: 2 }]),
  s("경마공원", "Seoul Racecourse Park", "4", [], [{ stationId: "4-선바위", time: 2 }, { stationId: "4-대공원", time: 2 }]),
  s("대공원", "Seoul Grand Park", "4", [], [{ stationId: "4-경마공원", time: 2 }, { stationId: "4-과천", time: 2 }]),
  s("과천", "Gwacheon", "4", [], [{ stationId: "4-대공원", time: 2 }, { stationId: "4-정부과천청사", time: 2 }]),
  s("정부과천청사", "Gwacheon Government Complex", "4", [], [{ stationId: "4-과천", time: 2 }, { stationId: "4-인덕원", time: 2 }]),
  s("인덕원", "Indeokwon", "4", [], [{ stationId: "4-정부과천청사", time: 2 }, { stationId: "4-평촌", time: 2 }]),
  s("평촌", "Pyeongchon", "4", [], [{ stationId: "4-인덕원", time: 2 }, { stationId: "4-범계", time: 2 }]),
  s("범계", "Beomgye", "4", [], [{ stationId: "4-평촌", time: 2 }, { stationId: "4-금정", time: 2 }]),
  s("금정", "Geumjeong", "4", ["1-금정"], [{ stationId: "4-범계", time: 2 }, { stationId: "4-산본", time: 3 }]),
  s("산본", "Sanbon", "4", [], [{ stationId: "4-금정", time: 3 }, { stationId: "4-수리산", time: 2 }]),
  s("수리산", "Surisan", "4", [], [{ stationId: "4-산본", time: 2 }, { stationId: "4-대야미", time: 2 }]),
  s("대야미", "Daeyami", "4", [], [{ stationId: "4-수리산", time: 2 }, { stationId: "4-반월", time: 3 }]),
  s("반월", "Banwol", "4", [], [{ stationId: "4-대야미", time: 3 }, { stationId: "4-상록수", time: 3 }]),
  s("상록수", "Sangnoksu", "4", [], [{ stationId: "4-반월", time: 3 }, { stationId: "4-한대앞", time: 2 }]),
  s("한대앞", "Hanyang Univ. at Ansan", "4", [], [{ stationId: "4-상록수", time: 2 }, { stationId: "4-중앙", time: 2 }]),
  s("중앙", "Jungang", "4", [], [{ stationId: "4-한대앞", time: 2 }, { stationId: "4-고잔", time: 2 }]),
  s("고잔", "Gojan", "4", [], [{ stationId: "4-중앙", time: 2 }, { stationId: "4-초지", time: 2 }]),
  s("초지", "Choji", "4", [], [{ stationId: "4-고잔", time: 2 }, { stationId: "4-안산", time: 2 }]),
  s("안산", "Ansan", "4", [], [{ stationId: "4-초지", time: 2 }, { stationId: "4-신길온천", time: 2 }]),
  s("신길온천", "Singil Hot Spring", "4", [], [{ stationId: "4-안산", time: 2 }, { stationId: "4-정왕", time: 2 }]),
  s("정왕", "Jeongwang", "4", [], [{ stationId: "4-신길온천", time: 2 }, { stationId: "4-오이도", time: 3 }]),
  s("오이도", "Oido", "4", [], [{ stationId: "4-정왕", time: 3 }]),
];

// ─── LINE 5 ──────────────────────────────────────────────────────────────────
const line5Stations: Station[] = [
  s("방화", "Banghwa", "5", [], [{ stationId: "5-개화산", time: 2 }]),
  s("개화산", "Gaehwasan", "5", [], [{ stationId: "5-방화", time: 2 }, { stationId: "5-김포공항", time: 2 }]),
  s("김포공항", "Gimpo Int'l Airport", "5", ["9-김포공항"], [{ stationId: "5-개화산", time: 2 }, { stationId: "5-송정", time: 2 }]),
  s("송정", "Songjeong", "5", [], [{ stationId: "5-김포공항", time: 2 }, { stationId: "5-마곡", time: 2 }]),
  s("마곡", "Magok", "5", [], [{ stationId: "5-송정", time: 2 }, { stationId: "5-발산", time: 2 }]),
  s("발산", "Balsan", "5", [], [{ stationId: "5-마곡", time: 2 }, { stationId: "5-우장산", time: 2 }]),
  s("우장산", "Ujangsan", "5", [], [{ stationId: "5-발산", time: 2 }, { stationId: "5-화곡", time: 2 }]),
  s("화곡", "Hwagok", "5", [], [{ stationId: "5-우장산", time: 2 }, { stationId: "5-까치산", time: 2 }]),
  s("까치산", "Kkachisan", "5", ["2-까치산"], [{ stationId: "5-화곡", time: 2 }, { stationId: "5-신정", time: 2 }]),
  s("신정", "Sinjeong", "5", [], [{ stationId: "5-까치산", time: 2 }, { stationId: "5-목동", time: 2 }]),
  s("목동", "Mokdong", "5", [], [{ stationId: "5-신정", time: 2 }, { stationId: "5-오목교", time: 2 }]),
  s("오목교", "Omokgyo", "5", [], [{ stationId: "5-목동", time: 2 }, { stationId: "5-양평", time: 3 }]),
  s("양평", "Yangpyeong", "5", [], [{ stationId: "5-오목교", time: 3 }, { stationId: "5-영등포구청", time: 2 }]),
  s("영등포구청", "Yeongdeungpo-gu Office", "5", ["2-영등포구청"], [{ stationId: "5-양평", time: 2 }, { stationId: "5-영등포시장", time: 2 }]),
  s("영등포시장", "Yeongdeungpo Market", "5", [], [{ stationId: "5-영등포구청", time: 2 }, { stationId: "5-신길", time: 2 }]),
  s("신길", "Singil", "5", ["1-신길"], [{ stationId: "5-영등포시장", time: 2 }, { stationId: "5-여의도", time: 2 }]),
  s("여의도", "Yeouido", "5", ["9-여의도"], [{ stationId: "5-신길", time: 2 }, { stationId: "5-여의나루", time: 3 }]),
  s("여의나루", "Yeouinaru", "5", [], [{ stationId: "5-여의도", time: 3 }, { stationId: "5-마포", time: 2 }]),
  s("마포", "Mapo", "5", [], [{ stationId: "5-여의나루", time: 2 }, { stationId: "5-공덕", time: 2 }]),
  s("공덕", "Gongdeok", "5", ["6-공덕"], [{ stationId: "5-마포", time: 2 }, { stationId: "5-애오개", time: 2 }]),
  s("애오개", "Ae-o-gae", "5", [], [{ stationId: "5-공덕", time: 2 }, { stationId: "5-충정로", time: 2 }]),
  s("충정로", "Chungjeongno", "5", ["2-충정로"], [{ stationId: "5-애오개", time: 2 }, { stationId: "5-서대문", time: 3 }]),
  s("서대문", "Seodaemun", "5", [], [{ stationId: "5-충정로", time: 3 }, { stationId: "5-광화문", time: 2 }]),
  s("광화문", "Gwanghwamun", "5", [], [{ stationId: "5-서대문", time: 2 }, { stationId: "5-종로3가", time: 2 }]),
  s("종로3가", "Jongno 3(sam)-ga", "5", ["1-종로3가", "3-종로3가"], [{ stationId: "5-광화문", time: 2 }, { stationId: "5-을지로4가", time: 2 }]),
  s("을지로4가", "Euljiro 4(sa)-ga", "5", ["2-을지로4가"], [{ stationId: "5-종로3가", time: 2 }, { stationId: "5-동대문역사문화공원", time: 2 }]),
  s("동대문역사문화공원", "Dongdaemun History & Culture Park", "5", ["2-동대문역사문화공원", "4-동대문역사문화공원"], [{ stationId: "5-을지로4가", time: 2 }, { stationId: "5-청구", time: 2 }]),
  s("청구", "Cheonggu", "5", ["6-청구"], [{ stationId: "5-동대문역사문화공원", time: 2 }, { stationId: "5-신금호", time: 2 }]),
  s("신금호", "Sin-geumho", "5", [], [{ stationId: "5-청구", time: 2 }, { stationId: "5-행당", time: 2 }]),
  s("행당", "Haengdang", "5", [], [{ stationId: "5-신금호", time: 2 }, { stationId: "5-왕십리", time: 2 }]),
  s("왕십리", "Wangsimni", "5", ["2-왕십리"], [{ stationId: "5-행당", time: 2 }, { stationId: "5-마장", time: 2 }]),
  s("마장", "Majang", "5", [], [{ stationId: "5-왕십리", time: 2 }, { stationId: "5-답십리", time: 2 }]),
  s("답십리", "Dapsimni", "5", [], [{ stationId: "5-마장", time: 2 }, { stationId: "5-장한평", time: 3 }]),
  s("장한평", "Janghanpyeong", "5", [], [{ stationId: "5-답십리", time: 3 }, { stationId: "5-군자", time: 2 }]),
  s("군자", "Gunja", "5", ["7-군자"], [{ stationId: "5-장한평", time: 2 }, { stationId: "5-아차산", time: 2 }]),
  s("아차산", "Achasan", "5", [], [{ stationId: "5-군자", time: 2 }, { stationId: "5-광나루", time: 2 }]),
  s("광나루", "Gwangnaru", "5", [], [{ stationId: "5-아차산", time: 2 }, { stationId: "5-천호", time: 2 }]),
  s("천호", "Cheonho", "5", ["8-천호"], [{ stationId: "5-광나루", time: 2 }, { stationId: "5-강동", time: 2 }]),
  // 강동 - branch junction: connects to both Macheon branch and Hanam branch
  s("강동", "Gangdong", "5", [],
    [
      { stationId: "5-천호", time: 2 },
      { stationId: "5-둔촌동", time: 2 },      // Macheon branch
      { stationId: "5-길동", time: 2 },         // Hanam branch
    ],
    ["5-강동-hanam"] // virtual branch transfer ID for platform change
  ),
  // Macheon branch (from 강동)
  s("둔촌동", "Dunchon-dong", "5", [], [{ stationId: "5-강동", time: 2 }, { stationId: "5-올림픽공원", time: 2 }]),
  s("올림픽공원", "Olympic Park", "5", [], [{ stationId: "5-둔촌동", time: 2 }, { stationId: "5-방이", time: 2 }]),
  s("방이", "Bangi", "5", [], [{ stationId: "5-올림픽공원", time: 2 }, { stationId: "5-오금", time: 2 }]),
  s("오금", "Ogeum", "5", ["3-오금"], [{ stationId: "5-방이", time: 2 }, { stationId: "5-개롱", time: 2 }]),
  s("개롱", "Gaerong", "5", [], [{ stationId: "5-오금", time: 2 }, { stationId: "5-거여", time: 2 }]),
  s("거여", "Geoyeo", "5", [], [{ stationId: "5-개롱", time: 2 }, { stationId: "5-마천", time: 2 }]),
  s("마천", "Macheon", "5", [], [{ stationId: "5-거여", time: 2 }]),
  // Hanam branch (from 강동)
  s("길동", "Gildong", "5", [], [{ stationId: "5-강동", time: 2 }, { stationId: "5-굽은다리", time: 2 }]),
  s("굽은다리", "Gubeundari", "5", [], [{ stationId: "5-길동", time: 2 }, { stationId: "5-명일", time: 2 }]),
  s("명일", "Myeongil", "5", [], [{ stationId: "5-굽은다리", time: 2 }, { stationId: "5-고덕", time: 2 }]),
  s("고덕", "Godeok", "5", [], [{ stationId: "5-명일", time: 2 }, { stationId: "5-상일동", time: 2 }]),
  s("상일동", "Sangil-dong", "5", [], [{ stationId: "5-고덕", time: 2 }, { stationId: "5-미사", time: 3 }]),
  s("미사", "Misa", "5", [], [{ stationId: "5-상일동", time: 3 }, { stationId: "5-하남풍산", time: 3 }]),
  s("하남풍산", "Hanam Pungsan", "5", [], [{ stationId: "5-미사", time: 3 }, { stationId: "5-하남시청", time: 2 }]),
  s("하남시청", "Hanam City Hall", "5", [], [{ stationId: "5-하남풍산", time: 2 }, { stationId: "5-하남검단산", time: 2 }]),
  s("하남검단산", "Hanam Geomdan Mountain", "5", [], [{ stationId: "5-하남시청", time: 2 }]),
];

// ─── LINE 6 ──────────────────────────────────────────────────────────────────
const line6Stations: Station[] = [
  s("응암", "Eungam", "6", [], [{ stationId: "6-역촌", time: 2 }]),
  s("역촌", "Yeokchon", "6", [], [{ stationId: "6-응암", time: 2 }, { stationId: "6-불광", time: 2 }]),
  s("불광", "Bulgwang", "6", [], [{ stationId: "6-역촌", time: 2 }, { stationId: "6-독바위", time: 2 }]),
  s("독바위", "Dokbawi", "6", [], [{ stationId: "6-불광", time: 2 }, { stationId: "6-연신내", time: 2 }]),
  s("연신내", "Yeonsinnae", "6", [], [{ stationId: "6-독바위", time: 2 }, { stationId: "6-구산", time: 2 }]),
  s("구산", "Gusan", "6", [], [{ stationId: "6-연신내", time: 2 }, { stationId: "6-새절", time: 2 }]),
  s("새절", "Saejeol", "6", [], [{ stationId: "6-구산", time: 2 }, { stationId: "6-증산", time: 2 }]),
  s("증산", "Jeungsan", "6", [], [{ stationId: "6-새절", time: 2 }, { stationId: "6-디지털미디어시티", time: 2 }]),
  s("디지털미디어시티", "Digital Media City", "6", [], [{ stationId: "6-증산", time: 2 }, { stationId: "6-가좌", time: 2 }]),
  s("가좌", "Gajwa", "6", [], [{ stationId: "6-디지털미디어시티", time: 2 }, { stationId: "6-합정", time: 2 }]),
  s("합정", "Hapjeong", "6", ["2-합정"], [{ stationId: "6-가좌", time: 2 }, { stationId: "6-망원", time: 2 }]),
  s("망원", "Mangwon", "6", [], [{ stationId: "6-합정", time: 2 }, { stationId: "6-마포구청", time: 2 }]),
  s("마포구청", "Mapo-gu Office", "6", [], [{ stationId: "6-망원", time: 2 }, { stationId: "6-상수", time: 2 }]),
  s("상수", "Sangsu", "6", [], [{ stationId: "6-마포구청", time: 2 }, { stationId: "6-광흥창", time: 2 }]),
  s("광흥창", "Gwanghŭngchang", "6", [], [{ stationId: "6-상수", time: 2 }, { stationId: "6-대흥", time: 2 }]),
  s("대흥", "Daeheung", "6", [], [{ stationId: "6-광흥창", time: 2 }, { stationId: "6-공덕", time: 2 }]),
  s("공덕", "Gongdeok", "6", ["5-공덕"], [{ stationId: "6-대흥", time: 2 }, { stationId: "6-효창공원앞", time: 2 }]),
  s("효창공원앞", "Hyochang Park", "6", [], [{ stationId: "6-공덕", time: 2 }, { stationId: "6-삼각지", time: 2 }]),
  s("삼각지", "Samgakji", "6", ["4-삼각지"], [{ stationId: "6-효창공원앞", time: 2 }, { stationId: "6-녹사평", time: 2 }]),
  s("녹사평", "Noksapyeong", "6", [], [{ stationId: "6-삼각지", time: 2 }, { stationId: "6-이태원", time: 2 }]),
  s("이태원", "Itaewon", "6", [], [{ stationId: "6-녹사평", time: 2 }, { stationId: "6-한강진", time: 2 }]),
  s("한강진", "Hangangjin", "6", [], [{ stationId: "6-이태원", time: 2 }, { stationId: "6-버티고개", time: 2 }]),
  s("버티고개", "Beortigogae", "6", [], [{ stationId: "6-한강진", time: 2 }, { stationId: "6-약수", time: 2 }]),
  s("약수", "Yaksu", "6", ["3-약수"], [{ stationId: "6-버티고개", time: 2 }, { stationId: "6-청구", time: 2 }]),
  s("청구", "Cheonggu", "6", ["5-청구"], [{ stationId: "6-약수", time: 2 }, { stationId: "6-신당", time: 2 }]),
  s("신당", "Sindang", "6", ["2-신당"], [{ stationId: "6-청구", time: 2 }, { stationId: "6-동묘앞", time: 2 }]),
  s("동묘앞", "Dongmyo", "6", ["1-동묘앞"], [{ stationId: "6-신당", time: 2 }, { stationId: "6-창신", time: 2 }]),
  s("창신", "Changsin", "6", [], [{ stationId: "6-동묘앞", time: 2 }, { stationId: "6-보문", time: 2 }]),
  s("보문", "Bomun", "6", [], [{ stationId: "6-창신", time: 2 }, { stationId: "6-안암", time: 2 }]),
  s("안암", "Anam", "6", [], [{ stationId: "6-보문", time: 2 }, { stationId: "6-고려대", time: 2 }]),
  s("고려대", "Korea Univ.", "6", [], [{ stationId: "6-안암", time: 2 }, { stationId: "6-월곡", time: 2 }]),
  s("월곡", "Wolgok", "6", [], [{ stationId: "6-고려대", time: 2 }, { stationId: "6-상월곡", time: 2 }]),
  s("상월곡", "Sangwolgok", "6", [], [{ stationId: "6-월곡", time: 2 }, { stationId: "6-돌곶이", time: 2 }]),
  s("돌곶이", "Dolgoji", "6", [], [{ stationId: "6-상월곡", time: 2 }, { stationId: "6-석계", time: 2 }]),
  s("석계", "Seokgye", "6", ["1-석계"], [{ stationId: "6-돌곶이", time: 2 }, { stationId: "6-태릉입구", time: 2 }]),
  s("태릉입구", "Taereung", "6", ["7-태릉입구"], [{ stationId: "6-석계", time: 2 }, { stationId: "6-화랑대", time: 2 }]),
  s("화랑대", "Hwarangdae", "6", [], [{ stationId: "6-태릉입구", time: 2 }, { stationId: "6-봉화산", time: 2 }]),
  s("봉화산", "Bonghwasan", "6", [], [{ stationId: "6-화랑대", time: 2 }, { stationId: "6-신내", time: 2 }]),
  s("신내", "Sinnae", "6", [], [{ stationId: "6-봉화산", time: 2 }]),
];

// ─── LINE 7 ──────────────────────────────────────────────────────────────────
const line7Stations: Station[] = [
  s("장암", "Jangam", "7", [], [{ stationId: "7-도봉산", time: 3 }]),
  s("도봉산", "Dobongsan", "7", ["1-도봉산"], [{ stationId: "7-장암", time: 3 }, { stationId: "7-수락산", time: 2 }]),
  s("수락산", "Suraksan", "7", [], [{ stationId: "7-도봉산", time: 2 }, { stationId: "7-마들", time: 2 }]),
  s("마들", "Madeul", "7", [], [{ stationId: "7-수락산", time: 2 }, { stationId: "7-노원", time: 2 }]),
  s("노원", "Nowon", "7", ["4-노원"], [{ stationId: "7-마들", time: 2 }, { stationId: "7-중계", time: 2 }]),
  s("중계", "Junggye", "7", [], [{ stationId: "7-노원", time: 2 }, { stationId: "7-하계", time: 2 }]),
  s("하계", "Hagye", "7", [], [{ stationId: "7-중계", time: 2 }, { stationId: "7-공릉", time: 2 }]),
  s("공릉", "Gongreung", "7", [], [{ stationId: "7-하계", time: 2 }, { stationId: "7-태릉입구", time: 2 }]),
  s("태릉입구", "Taereung", "7", ["6-태릉입구"], [{ stationId: "7-공릉", time: 2 }, { stationId: "7-먹골", time: 2 }]),
  s("먹골", "Meokgol", "7", [], [{ stationId: "7-태릉입구", time: 2 }, { stationId: "7-중화", time: 2 }]),
  s("중화", "Junghwa", "7", [], [{ stationId: "7-먹골", time: 2 }, { stationId: "7-상봉", time: 2 }]),
  s("상봉", "Sangbong", "7", [], [{ stationId: "7-중화", time: 2 }, { stationId: "7-면목", time: 2 }]),
  s("면목", "Myeonmok", "7", [], [{ stationId: "7-상봉", time: 2 }, { stationId: "7-사가정", time: 2 }]),
  s("사가정", "Sagajeong", "7", [], [{ stationId: "7-면목", time: 2 }, { stationId: "7-용마산", time: 2 }]),
  s("용마산", "Yongmasan", "7", [], [{ stationId: "7-사가정", time: 2 }, { stationId: "7-중곡", time: 2 }]),
  s("중곡", "Junggok", "7", [], [{ stationId: "7-용마산", time: 2 }, { stationId: "7-군자", time: 2 }]),
  s("군자", "Gunja", "7", ["5-군자"], [{ stationId: "7-중곡", time: 2 }, { stationId: "7-어린이대공원", time: 2 }]),
  s("어린이대공원", "Children's Grand Park", "7", [], [{ stationId: "7-군자", time: 2 }, { stationId: "7-건대입구", time: 2 }]),
  s("건대입구", "Konkuk Univ.", "7", ["2-건대입구"], [{ stationId: "7-어린이대공원", time: 2 }, { stationId: "7-뚝섬유원지", time: 2 }]),
  s("뚝섬유원지", "Ttukseom Resort", "7", [], [{ stationId: "7-건대입구", time: 2 }, { stationId: "7-청담", time: 2 }]),
  s("청담", "Cheongdam", "7", [], [{ stationId: "7-뚝섬유원지", time: 2 }, { stationId: "7-강남구청", time: 2 }]),
  s("강남구청", "Gangnam-gu Office", "7", [], [{ stationId: "7-청담", time: 2 }, { stationId: "7-학동", time: 2 }]),
  s("학동", "Hakdong", "7", [], [{ stationId: "7-강남구청", time: 2 }, { stationId: "7-논현", time: 2 }]),
  s("논현", "Nonhyeon", "7", [], [{ stationId: "7-학동", time: 2 }, { stationId: "7-반포", time: 2 }]),
  s("반포", "Banpo", "7", [], [{ stationId: "7-논현", time: 2 }, { stationId: "7-고속터미널", time: 2 }]),
  s("고속터미널", "Express Bus Terminal", "7", ["3-고속터미널", "9-고속터미널"], [{ stationId: "7-반포", time: 2 }, { stationId: "7-내방", time: 2 }]),
  s("내방", "Naebang", "7", [], [{ stationId: "7-고속터미널", time: 2 }, { stationId: "7-이수", time: 2 }]),
  s("이수", "Isu", "7", ["4-총신대입구"], [{ stationId: "7-내방", time: 2 }, { stationId: "7-남성", time: 2 }]),
  s("남성", "Namseong", "7", [], [{ stationId: "7-이수", time: 2 }, { stationId: "7-숭실대입구", time: 2 }]),
  s("숭실대입구", "Soongsil Univ.", "7", [], [{ stationId: "7-남성", time: 2 }, { stationId: "7-상도", time: 2 }]),
  s("상도", "Sangdo", "7", [], [{ stationId: "7-숭실대입구", time: 2 }, { stationId: "7-장승배기", time: 2 }]),
  s("장승배기", "Jangseungbaegi", "7", [], [{ stationId: "7-상도", time: 2 }, { stationId: "7-신대방삼거리", time: 2 }]),
  s("신대방삼거리", "Sindaebang Samgeori", "7", [], [{ stationId: "7-장승배기", time: 2 }, { stationId: "7-보라매", time: 2 }]),
  s("보라매", "Boramae", "7", [], [{ stationId: "7-신대방삼거리", time: 2 }, { stationId: "7-신풍", time: 2 }]),
  s("신풍", "Sinpung", "7", [], [{ stationId: "7-보라매", time: 2 }, { stationId: "7-대림", time: 2 }]),
  s("대림", "Daerim", "7", ["2-대림"], [{ stationId: "7-신풍", time: 2 }, { stationId: "7-남구로", time: 2 }]),
  s("남구로", "Nam Guro", "7", [], [{ stationId: "7-대림", time: 2 }, { stationId: "7-가산디지털단지", time: 2 }]),
  s("가산디지털단지", "Gasan Digital Complex", "7", ["1-가산디지털단지"], [{ stationId: "7-남구로", time: 2 }, { stationId: "7-철산", time: 2 }]),
  s("철산", "Cheolsan", "7", [], [{ stationId: "7-가산디지털단지", time: 2 }, { stationId: "7-광명사거리", time: 2 }]),
  s("광명사거리", "Gwangmyeong Sageori", "7", [], [{ stationId: "7-철산", time: 2 }, { stationId: "7-천왕", time: 2 }]),
  s("천왕", "Cheonwang", "7", [], [{ stationId: "7-광명사거리", time: 2 }, { stationId: "7-온수", time: 2 }]),
  s("온수", "Onsu", "7", [], [{ stationId: "7-천왕", time: 2 }, { stationId: "7-까치울", time: 2 }]),
  s("까치울", "Kkachiul", "7", [], [{ stationId: "7-온수", time: 2 }, { stationId: "7-부천종합운동장", time: 2 }]),
  s("부천종합운동장", "Bucheon Stadium", "7", [], [{ stationId: "7-까치울", time: 2 }, { stationId: "7-춘의", time: 2 }]),
  s("춘의", "Chunui", "7", [], [{ stationId: "7-부천종합운동장", time: 2 }, { stationId: "7-신중동", time: 2 }]),
  s("신중동", "Sin-jungdong", "7", [], [{ stationId: "7-춘의", time: 2 }, { stationId: "7-부천시청", time: 2 }]),
  s("부천시청", "Bucheon City Hall", "7", [], [{ stationId: "7-신중동", time: 2 }, { stationId: "7-상동", time: 2 }]),
  s("상동", "Sangdong", "7", [], [{ stationId: "7-부천시청", time: 2 }, { stationId: "7-삼산체육관", time: 2 }]),
  s("삼산체육관", "Samsan Gymnasium", "7", [], [{ stationId: "7-상동", time: 2 }, { stationId: "7-굴포천", time: 2 }]),
  s("굴포천", "Gulpocheon", "7", [], [{ stationId: "7-삼산체육관", time: 2 }, { stationId: "7-부평구청", time: 2 }]),
  s("부평구청", "Bupyeong-gu Office", "7", [], [{ stationId: "7-굴포천", time: 2 }, { stationId: "7-산곡", time: 2 }]),
  s("산곡", "Sangok", "7", [], [{ stationId: "7-부평구청", time: 2 }, { stationId: "7-석남", time: 2 }]),
  s("석남", "Seongnam", "7", [], [{ stationId: "7-산곡", time: 2 }]),
];

// ─── LINE 8 ──────────────────────────────────────────────────────────────────
const line8Stations: Station[] = [
  s("암사", "Amsa", "8", [], [{ stationId: "8-천호", time: 3 }]),
  s("천호", "Cheonho", "8", ["5-천호"], [{ stationId: "8-암사", time: 3 }, { stationId: "8-강동구청", time: 2 }]),
  s("강동구청", "Gangdong-gu Office", "8", [], [{ stationId: "8-천호", time: 2 }, { stationId: "8-몽촌토성", time: 3 }]),
  s("몽촌토성", "Mongchontoseong", "8", [], [{ stationId: "8-강동구청", time: 3 }, { stationId: "8-잠실", time: 3 }]),
  s("잠실", "Jamsil", "8", ["2-잠실"], [{ stationId: "8-몽촌토성", time: 3 }, { stationId: "8-석촌", time: 2 }]),
  s("석촌", "Seokchon", "8", ["9-석촌"], [{ stationId: "8-잠실", time: 2 }, { stationId: "8-송파", time: 2 }]),
  s("송파", "Songpa", "8", [], [{ stationId: "8-석촌", time: 2 }, { stationId: "8-가락시장", time: 2 }]),
  s("가락시장", "Garak Market", "8", ["3-가락시장"], [{ stationId: "8-송파", time: 2 }, { stationId: "8-문정", time: 2 }]),
  s("문정", "Munjeong", "8", [], [{ stationId: "8-가락시장", time: 2 }, { stationId: "8-장지", time: 2 }]),
  s("장지", "Jangji", "8", [], [{ stationId: "8-문정", time: 2 }, { stationId: "8-복정", time: 2 }]),
  s("복정", "Bokjeong", "8", [], [{ stationId: "8-장지", time: 2 }, { stationId: "8-산성", time: 3 }]),
  s("산성", "Sanseong", "8", [], [{ stationId: "8-복정", time: 3 }, { stationId: "8-남한산성입구", time: 2 }]),
  s("남한산성입구", "Namhansanseong", "8", [], [{ stationId: "8-산성", time: 2 }, { stationId: "8-단대오거리", time: 2 }]),
  s("단대오거리", "Dandae Sageori", "8", [], [{ stationId: "8-남한산성입구", time: 2 }, { stationId: "8-신흥", time: 2 }]),
  s("신흥", "Sinheung", "8", [], [{ stationId: "8-단대오거리", time: 2 }, { stationId: "8-수진", time: 2 }]),
  s("수진", "Sujin", "8", [], [{ stationId: "8-신흥", time: 2 }, { stationId: "8-모란", time: 2 }]),
  s("모란", "Moran", "8", [], [{ stationId: "8-수진", time: 2 }]),
];

// ─── LINE 9 ──────────────────────────────────────────────────────────────────
const line9Stations: Station[] = [
  s("개화", "Gaehua", "9", [], [{ stationId: "9-김포공항", time: 3 }]),
  s("김포공항", "Gimpo Int'l Airport", "9", ["5-김포공항"], [{ stationId: "9-개화", time: 3 }, { stationId: "9-공항시장", time: 2 }]),
  s("공항시장", "Airport Market", "9", [], [{ stationId: "9-김포공항", time: 2 }, { stationId: "9-신방화", time: 2 }]),
  s("신방화", "Sinbanghwa", "9", [], [{ stationId: "9-공항시장", time: 2 }, { stationId: "9-마곡나루", time: 2 }]),
  s("마곡나루", "Magok Naru", "9", [], [{ stationId: "9-신방화", time: 2 }, { stationId: "9-양천향교", time: 2 }]),
  s("양천향교", "Yangcheon Hyanggyo", "9", [], [{ stationId: "9-마곡나루", time: 2 }, { stationId: "9-가양", time: 2 }]),
  s("가양", "Gayang", "9", [], [{ stationId: "9-양천향교", time: 2 }, { stationId: "9-증미", time: 2 }]),
  s("증미", "Jeungmi", "9", [], [{ stationId: "9-가양", time: 2 }, { stationId: "9-등촌", time: 2 }]),
  s("등촌", "Deungchon", "9", [], [{ stationId: "9-증미", time: 2 }, { stationId: "9-염창", time: 2 }]),
  s("염창", "Yeomchang", "9", [], [{ stationId: "9-등촌", time: 2 }, { stationId: "9-신목동", time: 2 }]),
  s("신목동", "Sinmokdong", "9", [], [{ stationId: "9-염창", time: 2 }, { stationId: "9-선유도", time: 2 }]),
  s("선유도", "Seonyudo", "9", [], [{ stationId: "9-신목동", time: 2 }, { stationId: "9-당산", time: 2 }]),
  s("당산", "Dangsan", "9", ["2-당산"], [{ stationId: "9-선유도", time: 2 }, { stationId: "9-국회의사당", time: 2 }]),
  s("국회의사당", "National Assembly", "9", [], [{ stationId: "9-당산", time: 2 }, { stationId: "9-여의도", time: 2 }]),
  s("여의도", "Yeouido", "9", ["5-여의도"], [{ stationId: "9-국회의사당", time: 2 }, { stationId: "9-샛강", time: 2 }]),
  s("샛강", "Saetgang", "9", [], [{ stationId: "9-여의도", time: 2 }, { stationId: "9-노량진", time: 2 }]),
  s("노량진", "Noryangjin", "9", ["1-노량진"], [{ stationId: "9-샛강", time: 2 }, { stationId: "9-노들", time: 2 }]),
  s("노들", "Nodeul", "9", [], [{ stationId: "9-노량진", time: 2 }, { stationId: "9-흑석", time: 2 }]),
  s("흑석", "Heukseok", "9", [], [{ stationId: "9-노들", time: 2 }, { stationId: "9-동작", time: 2 }]),
  s("동작", "Dongjak", "9", ["4-동작"], [{ stationId: "9-흑석", time: 2 }, { stationId: "9-구반포", time: 2 }]),
  s("구반포", "Gubanpo", "9", [], [{ stationId: "9-동작", time: 2 }, { stationId: "9-신반포", time: 2 }]),
  s("신반포", "Sinbanpo", "9", [], [{ stationId: "9-구반포", time: 2 }, { stationId: "9-고속터미널", time: 2 }]),
  s("고속터미널", "Express Bus Terminal", "9", ["3-고속터미널", "7-고속터미널"], [{ stationId: "9-신반포", time: 2 }, { stationId: "9-사평", time: 2 }]),
  s("사평", "Sapyeong", "9", [], [{ stationId: "9-고속터미널", time: 2 }, { stationId: "9-신논현", time: 2 }]),
  s("신논현", "Sinnonhyeon", "9", [], [{ stationId: "9-사평", time: 2 }, { stationId: "9-언주", time: 2 }]),
  s("언주", "Eonju", "9", [], [{ stationId: "9-신논현", time: 2 }, { stationId: "9-선정릉", time: 2 }]),
  s("선정릉", "Seonjeongneung", "9", [], [{ stationId: "9-언주", time: 2 }, { stationId: "9-삼성중앙", time: 2 }]),
  s("삼성중앙", "Samseong (World Trade Center)", "9", ["2-삼성"], [{ stationId: "9-선정릉", time: 2 }, { stationId: "9-봉은사", time: 2 }]),
  s("봉은사", "Bongeunsa", "9", [], [{ stationId: "9-삼성중앙", time: 2 }, { stationId: "9-종합운동장", time: 2 }]),
  s("종합운동장", "Sports Complex", "9", ["2-종합운동장"], [{ stationId: "9-봉은사", time: 2 }, { stationId: "9-삼전", time: 2 }]),
  s("삼전", "Samjeon", "9", [], [{ stationId: "9-종합운동장", time: 2 }, { stationId: "9-석촌고분", time: 2 }]),
  s("석촌고분", "Seokchon Ancient Tombs", "9", [], [{ stationId: "9-삼전", time: 2 }, { stationId: "9-석촌", time: 2 }]),
  s("석촌", "Seokchon", "9", ["8-석촌"], [{ stationId: "9-석촌고분", time: 2 }, { stationId: "9-송파나루", time: 2 }]),
  s("송파나루", "Songpa Naru", "9", [], [{ stationId: "9-석촌", time: 2 }, { stationId: "9-한성백제", time: 2 }]),
  s("한성백제", "Hanseong Baekje", "9", [], [{ stationId: "9-송파나루", time: 2 }, { stationId: "9-올림픽공원", time: 2 }]),
  s("올림픽공원", "Olympic Park", "9", [], [{ stationId: "9-한성백제", time: 2 }, { stationId: "9-둔촌오륜", time: 2 }]),
  s("둔촌오륜", "Dunchon Oryun", "9", [], [{ stationId: "9-올림픽공원", time: 2 }, { stationId: "9-중앙보훈병원", time: 2 }]),
  s("중앙보훈병원", "Veterans Hospital", "9", [], [{ stationId: "9-둔촌오륜", time: 2 }]),
];

// ─── ALL STATIONS MAP ─────────────────────────────────────────────────────────
export const ALL_STATIONS: Station[] = [
  ...line1Stations,
  ...line2Stations,
  ...line3Stations,
  ...line4Stations,
  ...line5Stations,
  ...line6Stations,
  ...line7Stations,
  ...line8Stations,
  ...line9Stations,
];

export const STATIONS_BY_ID: Map<string, Station> = new Map(
  ALL_STATIONS.map((st) => [st.id, st])
);

// Index by Korean name (multiple stations with same name from different lines)
export const STATIONS_BY_NAME: Map<string, Station[]> = new Map();
for (const st of ALL_STATIONS) {
  const arr = STATIONS_BY_NAME.get(st.name) || [];
  arr.push(st);
  STATIONS_BY_NAME.set(st.name, arr);
}

// Search stations by partial name
export function searchStations(query: string): Station[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim();
  const results: Station[] = [];
  const seen = new Set<string>();

  for (const [name, stations] of STATIONS_BY_NAME.entries()) {
    if (name.includes(q)) {
      for (const st of stations) {
        if (!seen.has(st.id)) {
          seen.add(st.id);
          results.push(st);
        }
      }
    }
  }
  // Also search English names
  for (const st of ALL_STATIONS) {
    if (!seen.has(st.id) && st.nameEn.toLowerCase().includes(q.toLowerCase())) {
      seen.add(st.id);
      results.push(st);
    }
  }
  return results.slice(0, 10);
}

// Get all stations with a given Korean name
export function getStationsByName(name: string): Station[] {
  return STATIONS_BY_NAME.get(name) || [];
}

// Get transfer walk time between two stations at same physical location
export function getTransferWalkSeconds(fromLine: string, toLine: string): number {
  // Same line platform change (branch)
  if (fromLine === toLine) return 60;
  // Adjacent lines (some well-known quick transfers)
  const quickTransfers = new Set(["2-9", "9-2", "2-3", "3-2"]);
  const key = `${fromLine}-${toLine}`;
  if (quickTransfers.has(key)) return 120;
  return 180; // default 3 minutes
}

export function getLineHeadway(line: string): number {
  // Average headway in minutes during peak hours
  const headways: Record<string, number> = {
    "1": 5, "2": 3, "3": 4, "4": 4, "5": 4,
    "6": 5, "7": 4, "8": 5, "9": 5,
  };
  return headways[line] || 5;
}
