import type { AdmitRow } from "@/types/admit";

export type ScholarshipGroup = "메이저" | "플래티넘" | "슈프림";

export type ScholarshipRecipient = {
  studentKey: string;
  row: AdmitRow;
  group: ScholarshipGroup;
  amount: number;
  rank: number;
};

const MAJOR_MEDICAL_SCHOOLS = new Set([
  "서울대학교",
  "연세대학교",
  "가톨릭대학교",
  "성균관대학교",
  "울산대학교",
]);

const TOP_PHARMACY_SCHOOLS = new Set([
  "서울대학교",
  "연세대학교",
  "이화여자대학교",
  "중앙대학교",
  "성균관대학교",
  "가톨릭대학교",
  "경희대학교",
  "고려대학교",
  "숙명여자대학교",
  "한양대학교",
]);

const SUPREME_SCHOOLS = new Set([
  "한국과학기술원",
  "포항공과대학교",
  "연세대학교",
  "고려대학교",
]);

const UNIVERSITY_ALIASES: Record<string, string> = {
  서울대: "서울대학교",
  연세대: "연세대학교",
  고려대: "고려대학교",
  성균관대: "성균관대학교",
  가톨릭대: "가톨릭대학교",
  울산대: "울산대학교",
  이화여대: "이화여자대학교",
  이대: "이화여자대학교",
  중앙대: "중앙대학교",
  경희대: "경희대학교",
  숙명여대: "숙명여자대학교",
  한양대: "한양대학교",
  카이스트: "한국과학기술원",
  KAIST: "한국과학기술원",
  포스텍: "포항공과대학교",
  POSTECH: "포항공과대학교",
};

function compact(value: string) {
  return value.replace(/[\s()·._-]/g, "").toLowerCase();
}

function normalizeUniversity(value: string) {
  const trimmed = value.trim();
  const alias = UNIVERSITY_ALIASES[trimmed] ?? UNIVERSITY_ALIASES[trimmed.toUpperCase()];
  if (alias) return alias;

  const normalized = compact(trimmed);
  const aliasEntry = Object.entries(UNIVERSITY_ALIASES).find(
    ([key]) => compact(key) === normalized
  );
  return aliasEntry?.[1] ?? trimmed;
}

function isMedical(dept: string) {
  const value = compact(dept);
  if (
    value.includes("치의") ||
    value.includes("한의") ||
    value.includes("수의")
  ) {
    return false;
  }
  return (
    value.includes("의예") ||
    value === "의학과" ||
    value === "의과대학" ||
    value === "의학부"
  );
}

function isDental(dept: string) {
  const value = compact(dept);
  return value.includes("치의예") || value.includes("치의학");
}

function isOrientalMedicine(dept: string) {
  const value = compact(dept);
  return value.includes("한의예") || value.includes("한의학");
}

function isPharmacy(dept: string) {
  const value = compact(dept);
  return value.includes("약학") || value.includes("제약학");
}

function isVeterinary(dept: string) {
  return compact(dept).includes("수의예");
}

export function matchScholarship(row: AdmitRow): ScholarshipRecipient | null {
  if (row.status === "반려") return null;

  const university = normalizeUniversity(row.university);
  const dept = row.dept;
  const studentKey = `${compact(row.branch)}|${compact(row.name)}`;

  if (MAJOR_MEDICAL_SCHOOLS.has(university) && isMedical(dept)) {
    return { studentKey, row, group: "메이저", amount: 2_000_000, rank: 3 };
  }

  const isPlatinum =
    isMedical(dept) ||
    isDental(dept) ||
    (university === "경희대학교" && isOrientalMedicine(dept)) ||
    (TOP_PHARMACY_SCHOOLS.has(university) && isPharmacy(dept)) ||
    university === "서울대학교";

  if (isPlatinum) {
    return { studentKey, row, group: "플래티넘", amount: 700_000, rank: 2 };
  }

  const isSupreme =
    isOrientalMedicine(dept) ||
    isPharmacy(dept) ||
    isVeterinary(dept) ||
    SUPREME_SCHOOLS.has(university);

  if (isSupreme) {
    return { studentKey, row, group: "슈프림", amount: 500_000, rank: 1 };
  }

  return null;
}

export function selectScholarshipRecipients(rows: AdmitRow[]) {
  const bestByStudent = new Map<string, ScholarshipRecipient>();

  rows.forEach((row) => {
    const matched = matchScholarship(row);
    if (!matched) return;

    const current = bestByStudent.get(matched.studentKey);
    if (!current || matched.rank > current.rank) {
      bestByStudent.set(matched.studentKey, matched);
    }
  });

  return [...bestByStudent.values()].sort(
    (a, b) =>
      b.rank - a.rank ||
      a.row.university.localeCompare(b.row.university, "ko") ||
      a.row.name.localeCompare(b.row.name, "ko")
  );
}
