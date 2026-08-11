// 통합 문서1.xlsx의 4개년 집계값 (Sheet5, 2023~2026)
export const HISTORICAL_ADMISSIONS = [
  { year: 2023, submissions: 1322, students: 743 },
  { year: 2024, submissions: 1488, students: 933 },
  { year: 2025, submissions: 1486, students: 910 },
  { year: 2026, submissions: 1500, students: 951 },
] as const;

export const CUMULATIVE_BRANCH_RANKING = [
  ["이천기숙", 441],
  ["광주동구", 441],
  ["광주남구", 325],
  ["분당정자", 275],
  ["안성기숙", 270],
  ["은평서대문", 255],
  ["독학기숙", 235],
  ["강남", 230],
  ["용인수지", 230],
  ["목동", 221],
] as const;

export const CUMULATIVE_UNIVERSITY_RANKING = [
  ["중앙대학교", 276],
  ["경희대학교", 230],
  ["전남대학교", 224],
  ["고려대학교", 208],
  ["연세대학교", 202],
  ["한양대학교", 185],
  ["성균관대학교", 174],
  ["이화여자대학교", 172],
  ["부산대학교", 151],
  ["건국대학교", 147],
] as const;

export const CUMULATIVE_CATEGORY_COUNTS = [
  ["서울 주요 대학", 2298],
  ["기타 대학", 2818],
  ["의·치·한·약·수", 631],
  ["이공계 특성화", 49],
] as const;

export const CUMULATIVE_ADMISSION_TOTAL = 5796;
