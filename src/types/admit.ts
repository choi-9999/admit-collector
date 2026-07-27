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

export function isUniversitiesMap(data: any): data is UniversitiesMap {
  if (!data || typeof data !== "object") return false;
  for (const [u, val] of Object.entries(data as Record<string, any>)) {
    if (!val || typeof val !== "object") return false;
    if (typeof (val as any).code !== "string") return false;
    const depts = (val as any).depts;
    if (!depts || typeof depts !== "object") return false;
    for (const [d, code] of Object.entries(depts as Record<string, any>)) {
      if (typeof d !== "string") return false;
      if (typeof code !== "string") return false;
    }
  }
  return true;
}
