import { AdmitRow } from "@/types/admit";
import { buildCSV } from "./csv";
import { computeStats } from "./stats";

export function runCsvTests() {
  const failures: string[] = [];
  const sample: AdmitRow[] = [
    {
      id: "1",
      name: '홍 "길" 동',
      university: "테스트대",
      universityCode: "999",
      dept: "컴퓨터공학과",
      deptCode: "321",
      track: "수시",
      branch: "강남",
      status: "대기중",
    },
    {
      id: "2",
      name: "김철수",
      university: "예제대",
      universityCode: "111",
      dept: "경영학과",
      deptCode: "000",
      track: "정시",
      branch: "분당",
      status: "승인",
    },
  ];

  const csv = buildCSV(sample);
  const lines = csv.split("\n");

  if (lines.length !== 3) failures.push(`행 수 불일치: ${lines.length} (기대: 3)`);
  if (!lines[0].startsWith("No,이름,합격대학")) failures.push("헤더가 올바르지 않음");
  if (!lines[1].includes('"홍 ""길"" 동"')) failures.push("따옴표 이스케이프 실패");
  if (!csv.includes("\n")) failures.push("줄바꿈(\\n) 미포함");

  const csvEmpty = buildCSV([]);
  if (csvEmpty.split("\n").length !== 1) failures.push("빈 CSV 행 수 오류");

  if (failures.length) {
    alert("CSV 테스트 실패\n- " + failures.join("\n- "));
  } else {
    alert("✅ CSV 테스트 통과 (총 5건)");
  }
}

export function runCsvExtraTests() {
  const failures: string[] = [];
  const tricky: AdmitRow[] = [
    {
      id: "x1",
      name: "문자,열 포함",
      university: "테스트대",
      universityCode: "A,B",
      dept: "멀티\n라인",
      deptCode: "0\n0\n0",
      track: "수시",
      branch: "강남",
      status: "대기중",
    },
  ];
  const csv = buildCSV(tricky);
  if (!csv.includes('"A,B"')) failures.push("콤마 이스케이프 실패");
  if (!csv.includes('"멀티\n라인"')) failures.push("줄바꿈 필드 따옴표 처리 실패");
  alert(failures.length ? "CSV 확장 테스트 실패:\n- " + failures.join("\n- ") : "✅ CSV 확장 테스트 통과 (2건)");
}

export function runDashboardTests() {
  const sample: AdmitRow[] = [
    { id: "1", name: "A", university: "U1", universityCode: "1", dept: "D1", deptCode: "001", track: "수시", branch: "강남", status: "대기중" },
    { id: "2", name: "B", university: "U1", universityCode: "1", dept: "D2", deptCode: "002", track: "정시", branch: "강남", status: "승인" },
    { id: "3", name: "C", university: "U2", universityCode: "2", dept: "D3", deptCode: "003", track: "수시", branch: "분당", status: "반려" },
    { id: "4", name: "D", university: "U1", universityCode: "1", dept: "D4", deptCode: "004", track: "수시", branch: "분당", status: "승인" },
  ];
  const s = computeStats(sample);
  const fails: string[] = [];
  if (s.total !== 4) fails.push("총계 오류");
  if (s.byStatus["승인"] !== 2 || s.byStatus["반려"] !== 1 || s.byStatus["대기중"] !== 1) fails.push("상태 집계 오류");
  if (s.byTrack["수시"] !== 3 || s.byTrack["정시"] !== 1) fails.push("전형 집계 오류");
  if (s.topUniversities[0]?.name !== "U1" || s.topUniversities[0]?.count !== 3) fails.push("상위 대학 집계 오류");
  alert(fails.length ? "대시보드 테스트 실패:\n- " + fails.join("\n- ") : "✅ 대시보드 테스트 통과 (4건)");
}
