export type AdmitStatus = "대기중" | "승인" | "반려";

export type AdmitRow = {
  id: string;
  name: string;
  university: string;
  universityCode: string;
  dept: string;
  deptCode: string;
  track: "수시" | "정시";
  branch: string;
  file?: File;
  fileUrl?: string;
  filePublicId?: string;
  rejectReason?: string;
  status: AdmitStatus;
  admissionYear?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Applicant = {
  name: string;
  university?: string;
  department?: string;
  schoolCode?: string;
  departmentCode?: string;
  admission?: string;
  branch?: string;
};

export type UniversitiesMap = Record<
  string,
  { code: string; depts: Record<string, string> }
>;

export function isUniversitiesMap(data: unknown): data is UniversitiesMap {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  for (const val of Object.values(data as Record<string, unknown>)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) return false;
    const university = val as Record<string, unknown>;
    if (typeof university.code !== "string") return false;
    const depts = university.depts;
    if (!depts || typeof depts !== "object" || Array.isArray(depts)) return false;
    for (const code of Object.values(depts as Record<string, unknown>)) {
      if (typeof code !== "string") return false;
    }
  }
  return true;
}
