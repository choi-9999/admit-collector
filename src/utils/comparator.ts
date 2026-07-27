import { AdmitRow, Applicant } from "@/types/admit";
import {
  RULE1_SCHOOLS,
  RULE2_DEPTS,
  RULE3_DEPTS,
  RULE4_DEPTS,
  RULE5_DEPTS,
  RULE6_DEPTS,
  SCHOOL_CODE_ORDER,
  UNIVERSITY_ORDER,
} from "@/constants/masterData";

export function normalize(s?: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

export function bucketScore(row: Applicant) {
  const univ = normalize(row.university);
  const dept = normalize(row.department);

  if (RULE1_SCHOOLS.includes(univ) && dept === "의예과") return 0;

  if (RULE2_DEPTS.includes(dept)) return 1; // 의학계열
  if (RULE3_DEPTS.includes(dept)) return 2; // 치의계열
  if (RULE4_DEPTS.includes(dept)) return 3; // 한의계열
  if (RULE5_DEPTS.includes(dept)) return 4; // 약학계열
  if (RULE6_DEPTS.includes(dept)) return 5; // 수의예과

  return 9; // 그 외
}

export function weightByList(val: string | undefined, order: string[]) {
  const v = normalize(val);
  const idx = order.indexOf(v);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export function buildExportComparator() {
  return (a: Applicant, b: Applicant) => {
    const ba = bucketScore(a);
    const bb = bucketScore(b);
    if (ba !== bb) return ba - bb;

    const sa = weightByList(a.schoolCode, SCHOOL_CODE_ORDER);
    const sb = weightByList(b.schoolCode, SCHOOL_CODE_ORDER);
    if (sa !== sb) return sa - sb;

    const ua = weightByList(a.university, UNIVERSITY_ORDER);
    const ub = weightByList(b.university, UNIVERSITY_ORDER);
    if (ua !== ub) return ua - ub;

    if (ua === Number.MAX_SAFE_INTEGER && ub === Number.MAX_SAFE_INTEGER) {
      const u1 = normalize(a.university);
      const u2 = normalize(b.university);
      const lc = u1.localeCompare(u2, "ko");
      if (lc !== 0) return lc;
    }

    const n1 = normalize(a.name);
    const n2 = normalize(b.name);
    return n1.localeCompare(n2, "ko");
  };
}

export function toApplicant(r: AdmitRow): Applicant {
  return {
    name: r.name,
    university: r.university,
    department: r.dept,
    schoolCode: r.universityCode,
    departmentCode: r.deptCode,
    admission: r.track,
    branch: r.branch,
  };
}
