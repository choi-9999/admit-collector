import { AdmitRow } from "@/types/admit";

export function csvEscape(val: unknown): string {
  return `"${String(val ?? "").replaceAll('"', '""')}"`;
}

export function buildCSV(rows: AdmitRow[]): string {
  const header = ["No", "이름", "합격대학", "학교코드", "학과", "학과코드", "수시/정시", "지점명"];
  const lines: string[] = [header.join(",")];
  rows.forEach((r, idx) => {
    const row = [
      String(idx + 1),
      r.name,
      r.university,
      r.universityCode || "",
      r.dept,
      r.deptCode || "000",
      r.track,
      r.branch,
    ];
    lines.push(row.map(csvEscape).join(","));
  });
  return lines.join("\r\n");
}

export function downloadFile(filename: string, text: string) {
  const BOM = "\uFEFF"; // UTF-8 BOM 추가 (Excel 한글 깨짐 방지)
  const blob = new Blob([BOM + text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
