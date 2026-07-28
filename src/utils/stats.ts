import { AdmitRow, AdmitStatus } from "@/types/admit";

export function computeStats(rows: AdmitRow[]) {
  const total = rows.length;
  const byStatus = { "대기중": 0, "승인": 0, "반려": 0 } as Record<AdmitStatus, number>;
  const byTrack = { "수시": 0, "정시": 0 } as Record<"수시" | "정시", number>;
  const byUniv: Record<string, number> = {};

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byTrack[r.track] = (byTrack[r.track] ?? 0) + 1;
    byUniv[r.university] = (byUniv[r.university] ?? 0) + 1;
  }

  const approvedRate = total ? Math.round((byStatus["승인"] * 100) / total) : 0;
  const universityCount = Object.keys(byUniv).length;
  const universities = Object.keys(byUniv).sort((a, b) => a.localeCompare(b, "ko"));
  const topUniversities = Object.entries(byUniv)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { total, byStatus, byTrack, approvedRate, universityCount, universities, topUniversities };
}
