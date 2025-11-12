'use client'

import React, { useMemo, useRef, useState } from "react";

// --- 샘플 마스터 데이터 --- //
const BRANCHES = [
  "강남", "강북", "광명", "광주남구", "광주동구", "광주북구", "광주수완", "구리남양주", "김포", "노량진",
  "대구달서", "대구수성1관", "대구수성2관", "대전둔산", "독학기숙", "동탄", "마포", "목동", "목동오목교", "목포",
  "부산교대", "부산대", "부산북구", "부산서면", "부산해운대", "부천", "분당정자", "서울강동", "서울강서", "서울광진",
  "서울대", "서울도봉", "서울성동", "서울성북", "서울송파", "수원시청", "수원영통", "수원정자", "안산", "안성기숙",
  "용인수지", "울산남구", "원주", "은평서대문", "의정부", "이천기숙", "익산", "인천부평", "인천송도", "인천청라",
  "일산동구", "일산서구", "일산화정", "제주", "진주", "창원", "천안", "청주", "춘천", "파주", "평택", "하남" 
];

const INIT_UNIVERSITIES: Record<string, { code: string; depts: Record<string, string> }> = {
  "서울대학교": { code: "A", depts: { "자유전공학부": "000", "학부대학(광역)": "000", "경영대학": "000", "경제학부": "000", "국어교육과": "000", "농경제사회학부": "000", "사회교육과": "000", "사회학과": "000", "소비자아동학부-소비자학": "000", "소비자아동학부-아동가족학": "000", "심리학과": "000", "언론정보학과": "000", "역사교육과": "000", "역사학부": "000", "영어교육과": "000", "윤리교육과": "000", "인문계열": "000", "정치외교학부": "000", "지리교육과": "000", "지리학과": "000", "간호대학": "000", "건설환경공학부": "000", "건축학과": "000","기계공학부": "000", "물리교육과": "000", "물리천문학부-물리학": "000", "물리천문학부-천문학": "000", "바이오시스템소재학부": "000", "산림과학부": "000", "산업공학과": "000", "생명과학부": "000", "생물교육과": "000", "수리과학부": "000", "수의예과": "100", "수학교육과": "000", "스마트시스템과학과": "000", "식물생산과학부": "000", "식품동물생명공학부": "000", "식품영양학과": "000", "약학계열": "100", "에너지자원공학과": "000","원자핵공학과": "000", "응용생물화학부": "000", "의류학과": "000", "의예과": "100", "재료공학부": "000", "전기정보공학부": "000", "조경지역시스템공학부": "000", "조선해양공학과": "000", "지구과학교육과": "000","지구환경과학부": "000", "첨단융합학부": "000", "치의학과(학석사통합과정)": "100", "컴퓨터공학부": "000", "통계학과": "000", "항공우주공학과": "000", "화학교육과": "000", "화학부": "000", "화학생물공학부": "000",} },
  "연세대학교": { code: "A", depts: { "간호학과": "000", "식품영양학과": "000", "실내건축학과": "000", "아동가족학과": "000", "의류환경학과": "000", "통합디자인학과": "000", "경영학과": "000", "경제학부": "000", "교육학부": "000", "국어국문학과": "000", "노어노문학과": "000", "독어독문학과": "000", "문헌정보학과": "000", "문화인류학과": "000", "불어불문학과": "000", "사학과": "000", "사회복지학과": "000", "사회학과": "000", "신학과": "000", "심리학과": "000", "언론홍보영상학부": "000", "영어영문학과": "000", "응용통계학과": "000","정치외교학과": "000", "중어중문학과": "000", "철학과": "000", "행정학과": "000", "IT융합공학전공": "000", "건축공학과": "000", "기계공학부": "000", "대기과학과": "000", "도시공학과": "000", "디스플레이융합공학과": "000", "물리학과": "000", "사회환경시스템공학부": "000", "산업공학과": "000", "생명공학과": "000", "생화학과": "000", "수학과": "000", "시스템반도체공학과": "000", "시스템생물학과": "000","신소재공학부": "000", "약학과": "100", "의예과": "100", "인공지능학과": "000", "전기전자공학부": "000", "지구시스템과학과": "000", "천문우주학과": "000", "치의예과": "100", "화공생명공학부": "000","화학과": "000", "언더우드학부(인문사회)": "000", "융합인문사회과학부(HASS)": "000", "융합과학공학부(ISE)": "000",} },
  "고려대학교": { code: "A", depts: { "경영대학": "000", "경제학과": "000", "교육학과": "000", "국어교육과": "000", "국어국문학과": "000","국제학부": "000", "노어노문학과": "000", "독어독문학과": "000", "미디어학부": "000", "보건정책관리학부": "000","불어불문학과": "000", "사학과": "000", "사회학과": "000", "서어서문학과": "000", "식품자원경제학과": "000","심리학부": "000", "언어학과": "000", "역사교육과": "000", "영어교육과": "000", "영어영문학과": "000","일어일문학과": "000", "자유전공학부": "000", "정치외교학과": "000", "중어중문학과": "000", "지리교육과": "000","철학과": "000", "통계학과": "000", "한국사학과": "000", "한문학과": "000", "행정학과": "000","가정교육과": "000", "간호대학": "000", "건축사회환경공학부": "000", "건축학과": "000", "기계공학부": "000","데이터과학과": "000", "물리학과": "000", "바이오시스템의과학부": "000", "바이오의공학부": "000", "보건환경융합과학부": "000","산업경영공학부": "000", "생명공학부": "000", "생명과학부": "000", "수학과": "000", "수학교육과": "000","스마트보안학부": "000", "식품공학과": "000", "신소재공학부": "000", "융합에너지공학과": "000", "의과대학": "100","인공지능학과": "000", "전기전자공학부": "000", "지구환경과학과": "000", "컴퓨터학과": "000", "화공생명공학과": "000","화학과": "000", "환경생태공학부": "000", "반도체공학과": "000", "사이버국방학과": "000", "스마트모빌리티학부": "000","차세대통신학과": "000"} },
};

// --- 유틸 --- //
function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function downloadFile(filename: string, text: string) {
  const BOM = "\uFEFF"; // ✅ UTF-8 BOM 추가 (Excel 한글 깨짐 방지)
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

  const HOWTO_URL = 'https://www.notion.so/ETOOS247-20047bd4842d8054a139c5db10baae1d';

// --- 타입 --- //
export type AdmitStatus = "대기중" | "승인" | "반려";

type AdmitRow = {
  id: string;
  name: string;
  university: string;
  universityCode: string; // 학교코드
  dept: string;
  deptCode: string; // 학과코드 (기본 000)
  track: "수시" | "정시";
  branch: string; // 지점명
  file?: File; // 합격증 파일 (필수 업로드)
  fileUrl?: string;        // ✅ Cloudinary secure_url
  filePublicId?: string;   // ✅ Cloudinary public_id (삭제 등 후속처리용)
  rejectReason?: string; //
  status: AdmitStatus;
};

// ✅ 상태 막대 색상 클래스(정적 선언: Tailwind 퍼지 방지)
const STATUS_BAR_CLASS: Record<AdmitStatus, string> = {
  승인: "bg-green-500",
  반려: "bg-red-500",
  대기중: "bg-gray-500",
};

// --- 타입 보강 / 외부 JSON 스키마 --- //
type UniversitiesMap = Record<string, { code: string; depts: Record<string, string> }>;
function isUniversitiesMap(data: any): data is UniversitiesMap {
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

// === [SORT CONSTANTS & UTILS] 버킷(계열) → 학교코드 → 대학순서 → 이름 ===

// 타입: 기존 AdmitRow를 정렬 전용으로 보기 좋게 매핑해 쓰기 위함
type Applicant = {
  name: string;
  university?: string;
  department?: string;
  schoolCode?: string;
  departmentCode?: string;
  admission?: string;
  branch?: string;
};

// 학교코드 전체 순서: 리스트 밖/빈값은 맨 뒤
const SCHOOL_CODE_ORDER = ["A", "B", "E", "C", "D", "G", "F"];

// 합격대학 커스텀 순서: 리스트 밖은 가나다(오름차순)
const UNIVERSITY_ORDER = [
  "서울대학교","연세대학교","고려대학교","서강대학교","성균관대학교","한양대학교","이화여자대학교","중앙대학교",
  "경희대학교","한국외국어대학교","서울시립대학교","건국대학교","동국대학교","홍익대학교","숙명여자대학교", "한양대학교(ERICA)",
  "국민대학교","숭실대학교","세종대학교","단국대학교","인하대학교","아주대학교","서울과학기술대학교",
  "한국항공대학교","광운대학교","명지대학교","상명대학교","가톨릭대학교","성신여자대학교","가천대학교",
  "경기대학교","서울여자대학교","동덕여자대학교","덕성여자대학교","한성대학교","서경대학교","삼육대학교",
];

// 1순위(특수 조합): 학교 ∈ 아래 AND 학과 == "의예과"
const RULE1_SCHOOLS = ["서울대학교","연세대학교","성균관대학교","가톨릭대학교","울산대학교"];

// 2~6순위 버킷별 학과 목록
const RULE2_DEPTS = ["의예과","의학과(의예과)","의학과","의과대학","의예","의학부"];
const RULE3_DEPTS = ["치의예과","치의학전문대학원학석사통합과정","치의학과","치의예과(자연)","치의예과(인문)","치의학전문대학원(학석사통합)"];
const RULE4_DEPTS = ["한의예과","한의예과(인문)","한의예과(자연)","한의학전문대학원학석사통합과정"];
const RULE5_DEPTS = ["약학과","약학부","약학대학","약학계열","약학","약학부-약학","약학부-미래산업약학","제약학과"];
const RULE6_DEPTS = ["수의예과"];

// 가벼운 정규화(앞뒤/연속 공백만)
function normalize(s?: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

// 버킷 스코어: 숫자 작을수록 더 앞 (버킷 먼저, 학교/대학 나중)
function bucketScore(row: Applicant) {
  const univ = normalize(row.university);
  const dept = normalize(row.department);

  if (RULE1_SCHOOLS.includes(univ) && dept === "의예과") return 0; // Rule1

  if (RULE2_DEPTS.includes(dept)) return 1; // 의학계열
  if (RULE3_DEPTS.includes(dept)) return 2; // 치의계열
  if (RULE4_DEPTS.includes(dept)) return 3; // 한의계열
  if (RULE5_DEPTS.includes(dept)) return 4; // 약학계열
  if (RULE6_DEPTS.includes(dept)) return 5; // 수의예과

  return 9; // 그 외
}

// 커스텀 리스트 가중치(리스트 밖/빈값은 뒤)
function weightByList(val: string | undefined, order: string[]) {
  const v = normalize(val);
  const idx = order.indexOf(v);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

// 최종 comparator — “버킷 먼저 → 학교코드 → 대학 커스텀 → (둘 다 밖이면) 대학 가나다 → 이름”
export function buildExportComparator() {
  return (a: Applicant, b: Applicant) => {
    // 1) 버킷
    const ba = bucketScore(a);
    const bb = bucketScore(b);
    if (ba !== bb) return ba - bb;

    // 2) 학교코드
    const sa = weightByList(a.schoolCode, SCHOOL_CODE_ORDER);
    const sb = weightByList(b.schoolCode, SCHOOL_CODE_ORDER);
    if (sa !== sb) return sa - sb;

    // 3) 대학 커스텀 순서 (둘 다 밖이면 대학 가나다)
    const ua = weightByList(a.university, UNIVERSITY_ORDER);
    const ub = weightByList(b.university, UNIVERSITY_ORDER);
    if (ua !== ub) return ua - ub;

    if (ua === Number.MAX_SAFE_INTEGER && ub === Number.MAX_SAFE_INTEGER) {
      const u1 = normalize(a.university);
      const u2 = normalize(b.university);
      const lc = u1.localeCompare(u2, "ko");
      if (lc !== 0) return lc;
    }

    // 4) 이름 가나다
    const n1 = normalize(a.name);
    const n2 = normalize(b.name);
    return n1.localeCompare(n2, "ko");
  };
}

// AdmitRow -> Applicant 매핑 (우리 앱의 필드명에 맞춤)
function toApplicant(r: AdmitRow): Applicant {
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


// --- CSV 생성 로직 (순수 함수) & 테스트 유틸 --- //
function csvEscape(val: unknown): string {
  return `"${String(val ?? "").replaceAll('"', '""')}"`;
}

function buildCSV(rows: AdmitRow[]): string {
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

function runCsvTests() {
  const failures: string[] = [];
  const sample: AdmitRow[] = [
    {
      id: "1",
      name: '홍 "길" 동', // 따옴표 이스케이프 테스트
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

  // TC1: 헤더 + 2행
  if (lines.length !== 3) failures.push(`행 수 불일치: ${lines.length} (기대: 3)`);

  // TC2: 헤더 검증
  if (!lines[0].startsWith("No,이름,합격대학")) failures.push("헤더가 올바르지 않음");

  // TC3: 따옴표 이스케이프
  if (!lines[1].includes('"홍 ""길"" 동"')) failures.push("따옴표 이스케이프 실패");

  // TC4: 줄바꿈 구분자 정확성 (CRLF 금지 X, 단 최소 \n 포함)
  if (!csv.includes("\n")) failures.push("줄바꿈(\\n) 미포함");

  // TC5: 빈 배열 → 헤더만
  const csvEmpty = buildCSV([]);
  if (csvEmpty.split("\n").length !== 1) failures.push("빈 CSV 행 수 오류");

  if (failures.length) {
    alert("CSV 테스트 실패\n- " + failures.join("\n- "));
  } else {
    alert("✅ CSV 테스트 통과 (총 5건)");
  }
}

// 보강 테스트 (콤마/줄바꿈 필드 포함)
function runCsvExtraTests() {
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

// --- 대시보드 통계 --- //
function computeStats(rows: AdmitRow[]) {
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
  const topUniversities = Object.entries(byUniv)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  return { total, byStatus, byTrack, approvedRate, topUniversities };
}

// 간단 대시보드 테스트
function runDashboardTests() {
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

// --- 콤보박스(자동완성 + 자유입력) --- //
function Combobox({
  label,
  value,
  setValue,
  suggestions,
  placeholder,
  required,
  onBlur,
  restrictToList,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  onBlur?: () => void;
  restrictToList?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = value.trim();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(q.toLowerCase()));
  }, [suggestions, value]);

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 120);
            if (restrictToList && value.trim() && !suggestions.includes(value.trim())) {
              alert("목록에서 값을 선택하세요.");
              setValue(""); // 확정 금지
            }  
            onBlur?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHoverIndex((h) => Math.min(h + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHoverIndex((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (open && hoverIndex >= 0 && filtered[hoverIndex]) {
                setValue(filtered[hoverIndex]);
                setOpen(false);
              } else {
                setOpen(false);
                setValue(value.trim());
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              setHoverIndex(-1);
            }
          }}
          placeholder={placeholder}
          className={classNames(
            "w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white p-3 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 dark:text-gray-100",
          )}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </div>
        {open && (
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                {restrictToList ? "검색 결과 없음 (목록에서만 선택 가능)" : "검색 결과 없음. 입력값을 그대로 사용 가능"}
              </div>
            ) : (
              filtered.map((s, idx) => (
                <button
                  type="button"
                  key={s}
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(-1)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setValue(s);
                    setOpen(false);
                    inputRef.current?.blur();
                  }}
                  className={classNames(
                    "block w-full cursor-pointer px-3 py-2 text-left text-sm",
                    idx === hoverIndex ? "bg-blue-50 dark:bg-blue-900/50" : "bg-white hover:bg-gray-50 dark:bg-gray-900",
                  )}
                >
                  {s}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- 드래그앤드롭 업로더 --- //
function FileDrop({ file, setFile, error }: { file?: File; setFile: (f?: File) => void; error?: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ✅ 확장자/용량 검증
  const validate = (f: File) => {
    // 허용 MIME
    const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg"];
    // 허용 확장자 (Safari 등에서 MIME이 비어올 수 있어 보조 체크)
    const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const hasValidMime = ALLOWED_MIME.includes(f.type);
    const lowerName = f.name.toLowerCase();
    const hasValidExt = ALLOWED_EXT.some(ext => lowerName.endsWith(ext));

    if (!(hasValidMime || hasValidExt)) {
      alert("PDF/JPG/PNG 파일만 업로드 가능합니다.");
      return;
    }
    if (f.size > MAX_SIZE) {
      alert("파일 용량은 10MB 이하여야 합니다.");
      return;
    }

    setFile(f);
  };

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        합격증 파일 업로드 <span className="text-red-500">*</span>
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) validate(f); // ✅ 드래그앤드롭 경로도 검증
        }}
        className={classNames(
          "flex h-36 w-full items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition",
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/50"
            : error
              ? "border-red-500 bg-red-50 dark:bg-red-950"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
        )}
      >
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            파일을 이곳에 드래그앤드롭하거나, 아래 버튼으로 선택하세요.
          </p>
          {file ? (
            <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">선택됨: {file.name}</p>
          ) : (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">PDF/JPG/PNG 권장 · 최대 10MB</p>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            파일 선택
          </button>
          <input
            ref={inputRef}
            type="file"
            // ✅ 브라우저 파일 선택 대화상자 필터
            accept=".pdf,image/png,image/jpeg,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) validate(f); // ✅ 버튼 선택 경로도 검증
              // 같은 파일 다시 선택 시 onChange가 안불릴 수 있어 값 초기화
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          필수 항목입니다. 합격증 파일을 업로드해야 제출할 수 있어요.
        </p>
      )}
    </div>
  );
}

// --- 상단 지점 선택 바 --- //
function BranchSelector({
  current,
  setCurrent,
  branches,
}: {
  current: string | null;
  setCurrent: (b: string | null) => void;
  branches: string[];
}) {
  const [openList, setOpenList] = useState(false);
  const [input, setInput] = useState("");
  const [showSuggest, setShowSuggest] = useState(false); // 자동완성 표시 상태
  const [hoverIndex, setHoverIndex] = useState(-1); // 키보드 네비 인덱스

  const matchList = useMemo(
    () => branches.filter((b) => b.toLowerCase().includes(input.trim().toLowerCase())),
    [branches, input],
  );

  const exact = branches.includes(input.trim());

  const applySelection = (value?: string) => {
    const v = value ?? (exact ? input.trim() : matchList[0]);
    if (v) {
      setCurrent(v);
      setInput(v);
      setShowSuggest(false);
      setHoverIndex(-1);
    } else {
      alert("관리자가 지정한 지점명과 일치해야 합니다. 목록에서 선택하세요.");
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 dark:bg-blue-950 dark:ring-blue-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-blue-900 dark:text-blue-200">지점 선택</label>
          <div className="relative mt-1">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggest(true);
                setHoverIndex(-1);
              }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggest(false), 120);
                setHoverIndex(-1);
              }}
              onKeyDown={(e) => {
                if (!showSuggest && ["ArrowDown", "ArrowUp"].includes(e.key)) setShowSuggest(true);
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = Math.min(hoverIndex + 1, Math.max(matchList.length - 1, 0));
                  setHoverIndex(next);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = Math.max(hoverIndex - 1, 0);
                  setHoverIndex(prev);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (showSuggest && hoverIndex >= 0 && matchList[hoverIndex]) applySelection(matchList[hoverIndex]);
                  else applySelection();
                } else if (e.key === "Escape") {
                  setShowSuggest(false);
                  setHoverIndex(-1);
                }
              }}
              placeholder="지점명을 입력하세요 (자동완성)"
              className="w-full rounded-xl border border-blue-200 bg-white p-3 pr-28 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:border-blue-800 dark:bg-gray-900 dark:text-gray-100 placeholder:dark:text-gray-400"
            />
            <button
              type="button"
              onClick={() => applySelection()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              적용
            </button>
          </div>
          {showSuggest && input && (
            <div className="relative">
              <div className="absolute z-10 mt-2 max-h-52 w-full overflow-auto rounded-xl border border-blue-100 bg-white shadow dark:border-blue-900 dark:bg-gray-900">
                {matchList.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">일치하는 지점 없음</div>
                ) : (
                  matchList.map((b, idx) => (
                    <button
                      key={b}
                      type="button"
                      onMouseEnter={() => setHoverIndex(idx)}
                      onMouseLeave={() => setHoverIndex(-1)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applySelection(b);
                      }}
                      className={classNames(
                        "block w-full px-3 py-2 text-left text-sm",
                        idx === hoverIndex ? "bg-blue-50 dark:bg-blue-900/50" : "hover:bg-blue-50 dark:hover:bg-blue-900/30",
                      )}
                    >
                      {b}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-2 md:pt-0">
          <span className="text-sm text-blue-900 dark:text-blue-200">현재 지점:</span>
          <span className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-gray-900 dark:text-blue-300 dark:ring-blue-900">
            {current ?? "미선택"}
          </span>
          <button
            onClick={() => setOpenList((o) => !o)}
            className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50 dark:bg-gray-900 dark:text-blue-300 dark:ring-blue-900"
          >
            {openList ? "지점 목록 접기" : "지점 목록 펼치기"}
          </button>
        </div>
      </div>
      {openList && (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {branches.map((b) => (
            <button
              key={b}
              onClick={() => {
                setCurrent(b);
                setInput(b);
                setShowSuggest(false);
                setHoverIndex(-1);
              }}
              className={classNames(
                "rounded-lg px-3 py-2 text-left text-sm ring-1",
                current === b ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-blue-800 ring-blue-200 hover:bg-blue-50 dark:bg-gray-900 dark:text-blue-300 dark:ring-blue-900",
              )}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- 상태 뱃지 --- //
function StatusBadge({ s, reason }: { s: AdmitStatus; reason?: string }) {
  const styles: Record<AdmitStatus, string> = {
    "대기중": "bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700",
    "승인": "bg-green-100 text-green-800 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800",
    "반려": "bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800",
  };
  return (
    <span className={classNames("group relative rounded-full px-2.5 py-1 text-xs font-semibold ring-1", styles[s])}>
      {s}
      {/* ✅ 반려 + 사유가 있을 때만 툴팁 */}
      {s === "반려" && !!reason && (
        <span
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-max max-w-xs -translate-x-1/2 whitespace-pre-wrap rounded-md bg-gray-900 px-2 py-1 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
        >
          {reason}
        </span>
      )}
    </span>
  );
}

// --- 로그인 폼 컴포넌트 --- //
function LoginForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (pw === "admin123") {
          setError("");
          onSuccess();
        } else {
          setError("비밀번호가 올바르지 않습니다.");
        }
      }}
      className="grid gap-3"
    >
      <input
        type="password"
        placeholder="비밀번호"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className={classNames(
          "w-full rounded-xl border bg-white p-3 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 dark:text-gray-100",
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600",
        )}
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="mt-1 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 text-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700">취소</button>
        <button type="submit" className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">로그인</button>
      </div>
    </form>
  );
}

// --- 메인 페이지 --- //
export default function AdmitCollectorApp() {
  // 테마 (다크/라이트)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  React.useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initial = saved ?? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
  };

  // 권한/로그인 (영구화)
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // 지점
  const [branch, setBranch] = useState<string | null>(BRANCHES[0]);

  // 마스터(관리) 데이터
  const [universities, setUniversities] = useState(INIT_UNIVERSITIES);

  // 외부 JSON(public/universities.json) 로드 시도 (실패 시 INIT_UNIVERSITIES 유지)
  React.useEffect(() => {
  const url = "/api/universities";
  fetch(url, { cache: "no-store" })
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => {
  if (data && isUniversitiesMap(data)) {
  setUniversities(data);
  } else if (data) {
  console.warn("universities.json: 스키마 불일치. 기본값 유지", data);
  }
  })
  .catch((err) => {
  console.warn("universities.json: 로드 실패. 기본값 사용", err);
  });
  }, []);

  // 제출된 업로드 행
  const [rows, setRows] = useState<AdmitRow[]>([]);
  const [editRow, setEditRow] = useState<AdmitRow | null>(null);

  // 탭
  const [tab, setTab] = useState<"upload" | "status" | "admin">("upload");

  // 관리자 보기 옵션
  const [viewAllBranches, setViewAllBranches] = useState(false);

  // 업로드 폼 상태
  const [name, setName] = useState("");
  const [univ, setUniv] = useState("");
  const [dept, setDept] = useState("");
  const [track, setTrack] = useState<"수시" | "정시">("수시");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [fileError, setFileError] = useState(false);

  // --- Toast ---
  type ToastItem = { id: string; msg: string };
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (msg: string, ms = 2400) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, msg }]);
    window.setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, ms);
  };

  // --- 로그인 영구화 ---
  React.useEffect(() => {
    const tk = localStorage.getItem("admit_token");
    if (tk === "admin_token_v1") setIsAdmin(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admit_token");
    setIsAdmin(false);
    setTab("upload");
  };

  const univSuggestions = useMemo(() => Object.keys(universities), [universities]);
  const deptSuggestions = useMemo(() => {
    const u = universities[univ];
    return u ? Object.keys(u.depts) : [];
  }, [universities, univ]);

  // 코드 조회(없으면 기본값 처리)
  const getCodes = (uName: string, dName: string) => {
    const uEntry = universities[uName];
    const universityCode = uEntry?.code ?? "";
    const deptCode = uEntry?.depts?.[dName] ?? "000"; // 기본 000
    return { universityCode, deptCode };
  };

  const handleSubmit = async () => {
    setFileError(false);

    // ✅ 기본 검증
    if (!file) {
      setFileError(true);
      alert("합격증 파일은 필수입니다. 업로드 후 제출해주세요.");
      return;
    }
    if (!branch) {
      alert("지점을 먼저 선택해주세요.");
      return;
    }
    if (!name.trim() || !univ.trim() || !dept.trim()) {
      alert("이름/대학/학과를 모두 입력해주세요.");
      return;
    }
    if (!universities[univ.trim()]) {
      alert("합격 대학은 목록에서 선택한 항목만 제출할 수 있습니다.");
      return;
    }

    // ✅ 코드 조회
    const { universityCode, deptCode } = getCodes(univ.trim(), dept.trim());

    try {
      // ✅ 날짜별 폴더 자동 생성
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const folderPath = `admit/${branch}/${year}/${month}/${day}`;

      // ✅ 파일명 생성 ("이름_대학_날짜.확장자")
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const safeName = name.replace(/\s+/g, ''); // 공백 제거
      const safeUniv = univ.replace(/\s+/g, '');
      const formattedDate = `${year}${month}${day}`;
      const customFileName = `${safeName}_${safeUniv}_${formattedDate}.${ext}`;

      // ✅ FormData 구성
      const formData = new FormData();
      formData.append('file', file, customFileName); // ← 파일명 지정
      formData.append('folder', folderPath); // ← 폴더 지정
      formData.append('branch', branch);
      formData.append('name', name.trim());
      formData.append('university', univ.trim());
      formData.append('dept', dept.trim());

      // ✅ 백엔드 업로드 요청
      const uploadRes = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData,
      });

      const contentType = uploadRes.headers.get('content-type') || '';
      let payload: any;
      if (contentType.includes('application/json')) {
        payload = await uploadRes.json();
      } else {
        const text = await uploadRes.text();
        console.error('[Upload non-JSON response]', text);
        alert('업로드 응답이 JSON 형식이 아닙니다. 콘솔을 확인하세요.');
        return;
      }

      if (!uploadRes.ok || !payload?.ok) {
        console.error('[Upload error]', payload);
        alert(payload?.message || payload?.error || '업로드 실패');
        return;
      }

      // ✅ 상태 반영
      const newRow: AdmitRow = {
        id: Math.random().toString(36).slice(2),
        name: name.trim(),
        university: univ.trim(),
        universityCode,
        dept: dept.trim(),
        deptCode,
        track,
        branch,
        file,
        status: "대기중",
      };
      setRows((rs) => [newRow, ...rs]);

      // ✅ 폼 초기화
      setName("");
      setUniv("");
      setDept("");
      setTrack("수시");
      setFile(undefined);

      // ✅ 성공 Toast
      pushToast("✅ 제출이 완료되었습니다. 파일이 저장되었습니다.");

    } catch (err) {
      console.error('❌ Upload exception:', err);
      alert("업로드 중 오류가 발생했습니다. 네트워크를 확인하세요.");
    }
  };

    // 관리자: 승인/반려
    const setRowStatus = async (id: string, s: AdmitStatus, reason?: string) => {
      try {
        const ok = await fetch(`/api/admits/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("admit_token") || ""}`
          },
          body: JSON.stringify({ status: s, reason }), // ✅ 사유 함께 전송
        });

        if (!ok.ok) throw new Error(`HTTP ${ok.status}`);

        // 서버 성공 시 로컬 반영
        setRows((rs) =>
          rs.map((r) =>
            r.id === id ? { ...r, status: s, rejectReason: s === "반려" ? (reason || r.rejectReason) : undefined } : r
          )
        );
        pushToast("✅ 상태가 저장되었습니다.");
      } catch (e) {
        // 서버 미연동/404여도 로컬 반영 (임시 운영 편의)
        setRows((rs) =>
          rs.map((r) =>
            r.id === id ? { ...r, status: s, rejectReason: s === "반려" ? (reason || r.rejectReason) : undefined } : r
          )
        );
        pushToast("⚠️ 서버 미연동: 로컬에서만 반영되었습니다.");
        console.warn("setRowStatus fallback:", e);
      }
    };

  // 관리자: 대학/학과/코드 관리
  const upsertUniversity = (uName: string, code: string) => {
    setUniversities((m) => ({ ...m, [uName]: m[uName] ? { ...m[uName], code } : { code, depts: {} } }));
  };
  const upsertDept = (uName: string, dName: string, dCode: string) => {
    setUniversities((m) => ({
      ...m,
      [uName]: {
        code: m[uName]?.code ?? "",
        depts: { ...(m[uName]?.depts ?? {}), [dName]: dCode || "000" },
      },
    }));
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => (isAdmin && viewAllBranches ? true : r.branch === branch));
  }, [rows, isAdmin, viewAllBranches, branch]);

  const stats = useMemo(() => computeStats(filteredRows), [filteredRows]);

  // ✅ 승인 상태만 CSV로 추출
  const exportCSV = (onlyApproved: boolean = true) => {
    // 1) 대상 행 선택
    const target = onlyApproved
      ? filteredRows.filter(r => r.status === "승인")
      : filteredRows;

    if (target.length === 0) {
      alert(onlyApproved ? "승인 상태의 데이터가 없습니다." : "내보낼 데이터가 없습니다.");
      return;
    }

    // 2) 정렬 준비 (동일 로직 재사용)
    const rowsForSort = target.map((row, idx) => ({
      row,
      app: toApplicant(row),
      idx,
    }));

    const cmp = buildExportComparator();
    rowsForSort.sort((a, b) => {
      const c = cmp(a.app, b.app);
      return c !== 0 ? c : a.idx - b.idx; // 동점이면 원래 순서 유지
    });

    const sortedRows = rowsForSort.map(x => x.row);

    // 3) CSV 생성 + 파일명
    const csv = buildCSV(sortedRows);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    const filename = onlyApproved
      ? `admit-approved-${y}${m}${d}.csv`
      : `admit-all-${y}${m}${d}.csv`;

    downloadFile(filename, csv);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6 min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* 상단 헤더 */}
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">이투스247학원 합격자 취합 페이지</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-xl px-3 py-2 text-sm font-semibold ring-1 shadow-sm bg-white text-gray-800 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            {theme === "dark" ? "라이트" : "다크"} 모드
          </button>

            {/* 사용방법 박스(링크) */}
            <a
              href={HOWTO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl px-3 py-2 text-sm font-semibold ring-1 shadow-sm bg-white text-blue-700 ring-blue-300 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-300 dark:ring-blue-700"
              title="사용방법(새 탭에서 열기)"
            >
              사용방법
            </a>

          {isAdmin && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800">
              관리자 모드
            </span>
          )}
          {isAdmin ? (
            <button
              onClick={handleLogout}
              className="rounded-xl px-3 py-2 text-sm font-semibold ring-1 shadow-sm bg-white text-gray-800 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700"
            >
              로그아웃
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="rounded-xl px-3 py-2 text-sm font-semibold ring-1 shadow-sm bg-gray-900 text-white ring-gray-900 hover:bg-black"
            >
              관리자 로그인
            </button>
          )}
        </div>
      </header>

      {/* 지점 선택 */}
      <BranchSelector current={branch} setCurrent={setBranch} branches={BRANCHES} />

      {/* 탭 네비게이션 */}
      <nav className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("upload")}
          className={classNames(
            "rounded-xl px-4 py-2 text-sm font-semibold ring-1",
            tab === "upload" ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-blue-800 ring-blue-200 hover:bg-blue-50 dark:bg-blue-900/50",
          )}
        >
          지점 업로드
        </button>
        <button
          onClick={() => setTab("status")}
          className={classNames(
            "rounded-xl px-4 py-2 text-sm font-semibold ring-1",
            tab === "status" ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-blue-800 ring-blue-200 hover:bg-blue-50 dark:bg-blue-900/50",
          )}
        >
          지점 현황
        </button>
        <button
          onClick={() => (isAdmin ? setTab("admin") : alert("관리자만 접근 가능합니다."))}
          className={classNames(
            "rounded-xl px-4 py-2 text-sm font-semibold ring-1",
            tab === "admin" ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-blue-800 ring-blue-200 hover:bg-blue-50 dark:bg-blue-900/50",
          )}
        >
          관리자 대시보드
        </button>
      </nav>

      {/* 탭 컨텐츠 */}
      {tab === "upload" && (
        <section className="grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 md:grid-cols-2 md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">이름 <span className="text-red-500">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:text-gray-100"
              />
            </div>

            <Combobox
              label="합격 대학"
              value={univ}
              setValue={setUniv}
              suggestions={univSuggestions}
              placeholder="예: 서울대학교"
              required
              restrictToList
            />

            <Combobox
              label="학과"
              value={dept}
              setValue={setDept}
              suggestions={deptSuggestions}
              placeholder="예: 경영학과"
              required
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">전형 <span className="text-red-500">*</span></label>
              <div className="flex gap-3">
                {["수시", "정시"].map((t) => (
                  <label key={t} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="track"
                      value={t}
                      checked={track === t}
                      onChange={() => setTrack(t as any)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            <FileDrop file={file} setFile={setFile} error={fileError} />
          </div>

          <div className="flex flex-col justify-between">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">미리보기</h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300">
                <li><span className="text-gray-500">이름:</span> {name || "-"}</li>
                <li>
                  <span className="text-gray-500">대학/코드:</span> {univ || "-"}
                  {univ && <span className="text-gray-400"> ({universities[univ]?.code ?? "미등록"})</span>}
                </li>
                <li>
                  <span className="text-gray-500">학과/코드:</span> {dept || "-"}
                  {dept && <span className="text-gray-400"> ({(universities[univ]?.depts ?? {})[dept] ?? "000"})</span>}
                </li>
                <li><span className="text-gray-500">전형:</span> {track}</li>
                <li><span className="text-gray-500">지점:</span> {branch ?? "미선택"}</li>
                <li><span className="text-gray-500">파일:</span> {file ? file.name : "(없음)"}</li>
              </ul>
            </div>

            <div className="mt-4">
              <button
                onClick={handleSubmit}
                className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-base font-extrabold text-white shadow-lg transition hover:translate-y-[-1px] hover:bg-blue-700"
              >
                제출하기
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">파일 미첨부 시 제출이 차단되고 경고가 표시됩니다.</p>
            </div>
          </div>
        </section>
      )}

      {tab === "status" && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 md:p-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {isAdmin && viewAllBranches ? "전체 지점 업로드 현황" : `${branch ?? "지점"} 업로드 현황`}
            </h3>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={viewAllBranches}
                    onChange={(e) => setViewAllBranches(e.target.checked)}
                  />
                  전체 보기
                </label>
              )}
              {isAdmin && (
                <button onClick={runDashboardTests} className="rounded-xl bg-indigo-600 px-2 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-700">
                  대시보드 테스트
                </button>
              )}
            </div>
          </div>

          {/* 📊 대시보드 카드 */}
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            {/* 총 제출 */}
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
              <div className="text-xs text-gray-500">총 제출</div>
              <div className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-gray-100">{stats.total}</div>
              <div className="mt-1 text-xs text-gray-500">현재 보기: {isAdmin && viewAllBranches ? '전체 지점' : (branch ?? '미선택')}</div>
            </div>

            {/* 상태 분포 */}
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
              <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">상태 분포</div>
              {(["승인","반려","대기중"] as AdmitStatus[]).map((k) => {
                const count = stats.byStatus[k];
                const pct = stats.total ? Math.round((count * 100) / stats.total) : 0;
                return (
                  <div key={k} className="mb-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{k}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-gray-200 dark:bg-gray-700">
                      {/* ✅ 동적 템플릿 문자열 제거, 정적 클래스 맵 사용 */}
                      <div className={classNames("h-2 rounded", STATUS_BAR_CLASS[k])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 전형 분포 */}
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
              <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">전형 분포</div>
              {(['수시','정시'] as const).map((t) => {
                const count = stats.byTrack[t];
                const pct = stats.total ? Math.round((count*100)/stats.total) : 0;
                return (
                  <div key={t} className="mb-1">
                    <div className="flex items-center justify-between text-xs"><span>{t}</span><span>{count} ({pct}%)</span></div>
                    <div className="mt-1 h-2 w-full rounded bg-gray-200 dark:bg-gray-700">
                      <div className="h-2 rounded bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 상위 대학 */}
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
              <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">상위 대학</div>
              {stats.topUniversities.length === 0 ? (
                <div className="text-xs text-gray-500">데이터 없음</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.topUniversities.slice(0,3).map((u) => (
                    <span key={u.name} className="rounded-full bg-white px-2 py-1 text-xs ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700">
                      {u.name} <span className="text-gray-500">×{u.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-2">상태</th>
                  <th className="px-2">이름</th>
                  <th className="px-2">합격대학</th>
                  <th className="px-2">학교코드</th>
                  <th className="px-2">학과</th>
                  <th className="px-2">학과코드</th>
                  <th className="px-2">전형</th>
                  <th className="px-2">지점</th>
                  {isAdmin && <th className="px-2">관리</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-2 py-6 text-center text-sm text-gray-500">
                      업로드된 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.id} className="rounded-xl bg-white shadow dark:bg-gray-900">
                      <td className="px-2 py-3"><StatusBadge s={r.status} reason={r.rejectReason} /></td>
                      <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.name}</td>
                      <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.university}</td>
                      <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.universityCode || ""}</td>
                      <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.dept}</td>
                      <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.deptCode || "000"}</td>
                      <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.track}</td>
                      <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.branch}</td>
                      {isAdmin && (
                        <td className="px-2 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRowStatus(r.id, "승인")}
                              className="rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800 dark:hover:bg-green-900/50"
                            >
                              승인
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt("반려 사유를 입력하세요 (필수)");
                                if (!reason || !reason.trim()) return; // 취소/공백이면 중단
                                await setRowStatus(r.id, "반려", reason.trim()); // ✅ 사유 전달
                              }}
                              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300"
                            >
                              반려
                            </button>
                            <button
                              onClick={() => setEditRow(r)}
                              className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300"
                            >
                              수정
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {isAdmin && filteredRows.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => exportCSV(true)} // ✅ 승인건만
                className="rounded-xl bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
              >
                CSV 추출
              </button>
            </div>
          )}
        </section>
      )}

      {tab === "admin" && (
        <section className="grid gap-6 md:grid-cols-2">
          {/* 대학/학과/코드 관리 */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 md:p-6">
            <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">대학 / 학과 / 코드 관리</h3>

            <UniversityManager
              universities={universities}
              onUpsertUniversity={upsertUniversity}
              onUpsertDept={upsertDept}
            />
          </div>

          {/* 합격자 승인/반려 + Export + CSV 테스트 */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 md:p-6">
            <div className="mb-3 flex items-center justify-between gap-2 text-sm">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">합격자 검토 / 일괄 작업</h3>
              <div className="flex gap-2">
                <button
                  onClick={runCsvTests}
                  className="rounded-xl bg-indigo-600 px-2 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
                >
                  CSV 테스트
                </button>
                <button
                  onClick={runCsvExtraTests}
                  className="rounded-xl bg-indigo-600 px-2 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
                >
                  CSV 확장 테스트
                </button>
                <button
                  onClick={() => {
                    // 1) comparator 준비
                    const cmp = buildExportComparator();
                    // 2) rows -> Applicant로 매핑해서 안전하게 정렬
                    const sorted = rows
                      .map((r, idx) => ({ r, a: toApplicant(r), idx })) // 안정 정렬 대비 idx 포함
                      .sort((x, y) => {
                        const c = cmp(x.a, y.a);
                        return c !== 0 ? c : x.idx - y.idx; // 동점이면 입력순 유지
                      })
                      .map(x => x.r);

                    console.log("[EXPORT PREVIEW] sorted", sorted);
                    alert("콘솔에서 정렬 결과를 확인하세요 (F12 → Console)");
                  }}
                  className="rounded-xl bg-slate-600 px-2 py-1.5 text-xs font-bold text-white shadow hover:bg-slate-700"
                >
                  정렬 미리보기(콘솔)
                </button>
                <button
                  onClick={() => exportCSV(true)} // ✅ 승인건만
                  className="rounded-xl bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                >
                  CSV 추출
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="px-2">상태</th>
                    <th className="px-2">이름</th>
                    <th className="px-2">대학</th>
                    <th className="px-2">학과</th>
                    <th className="px-2">전형</th>
                    <th className="px-2">지점</th>
                    <th className="px-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-6 text-center text-sm text-gray-500">
                        데이터 없음
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="rounded-xl bg-white shadow dark:bg-gray-900">
                        <td className="px-2 py-3"><StatusBadge s={r.status} /></td>
                        <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.name}</td>
                        <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.university}</td>
                        <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.dept}</td>
                        <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.track}</td>
                        <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-200">{r.branch}</td>
                        <td className="px-2 py-3 text-sm">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setRowStatus(r.id, "승인")}
                              className="rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => setRowStatus(r.id, "반려")}
                              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300"
                            >
                              반려
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 로그인 모달 */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">관리자 로그인</h3>
            
            <LoginForm
              onSuccess={() => {
                localStorage.setItem("admit_token", "admin_token_v1");
                setIsAdmin(true);
                setTab("admin");
                setShowLogin(false);
              }}
              onCancel={() => setShowLogin(false)}
            />
          </div>
        </div>
      )}

      {/* 관리자 수정 모달 */}
      {editRow && (
        <EditRowModal
          row={editRow}
          universities={universities}
          branches={BRANCHES}
          onClose={() => setEditRow(null)}
          onSave={(patch) => {
            // 로컬 상태 갱신 (백엔드 연동 시 여기에 PATCH 호출 추가)
            setRows((rs) =>
              rs.map((r) => (r.id === editRow.id ? { ...r, ...patch } : r))
            );
            setEditRow(null);
            pushToast("✅ 항목이 수정되었습니다.");
          }}
        />
      )}

      {/* Toast Container */}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-xl bg-gray-900/95 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-white/10"
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* 푸터 */}
      <footer className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
        Copyright ⓒ ETOOS ECI Co.,Ltd. All rights Reserved.
      </footer>
    </div>
  );
}

// --- 대학/학과/코드 관리 컴포넌트 --- //
function UniversityManager({
  universities,
  onUpsertUniversity,
  onUpsertDept,
}: {
  universities: Record<string, { code: string; depts: Record<string, string> }>;
  onUpsertUniversity: (uName: string, code: string) => void;
  onUpsertDept: (uName: string, dName: string, dCode: string) => void;
}) {
  const [uName, setUName] = useState("");
  const [uCode, setUCode] = useState("");
  const [dName, setDName] = useState("");
  const [dCode, setDCode] = useState("000");

  const [selectedU, setSelectedU] = useState<string>("");

  const uList = Object.keys(universities).sort((a, b) => a.localeCompare(b));
  const dList = useMemo(
    () => Object.keys(universities[selectedU]?.depts || {}).sort((a, b) => a.localeCompare(b)),
    [universities, selectedU],
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 대학 추가/수정 */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">대학 추가 / 코드 수정</h4>
        <div className="grid gap-2">
          <input
            value={uName}
            onChange={(e) => setUName(e.target.value)}
            placeholder="대학명"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-100"
          />
          <input
            value={uCode}
            onChange={(e) => setUCode(e.target.value)}
            placeholder="학교코드 (예: 100)"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-100"
          />
          <button
            onClick={() => {
              if (!uName.trim()) return alert("대학명을 입력하세요");
              onUpsertUniversity(uName.trim(), uCode.trim());
              setUName("");
              setUCode("");
            }}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
          >
            저장
          </button>
        </div>

        <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="px-2 py-2">대학명</th>
                <th className="px-2 py-2">학교코드</th>
              </tr>
            </thead>
            <tbody>
              {uList.map((u) => (
                <tr key={u} className="border-t text-sm dark:border-gray-800">
                  <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{u}</td>
                  <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{universities[u].code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 학과 추가/수정 */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">학과 추가 / 코드 수정</h4>
        <div className="grid gap-2">
          <select
            value={selectedU}
            onChange={(e) => setSelectedU(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-100"
          >
            <option value="">대학 선택</option>
            {uList.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <input
            value={dName}
            onChange={(e) => setDName(e.target.value)}
            placeholder="학과명"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-100"
          />
          <input
            value={dCode}
            onChange={(e) => setDCode(e.target.value)}
            placeholder="학과코드 (기본 000)"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-100"
          />
          <button
            onClick={() => {
              if (!selectedU) return alert("대학을 먼저 선택하세요");
              if (!dName.trim()) return alert("학과명을 입력하세요");
              onUpsertDept(selectedU, dName.trim(), dCode.trim() || "000");
              setDName("");
              setDCode("000");
            }}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
          >
            저장
          </button>
        </div>

        <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="px-2 py-2">학과명</th>
                <th className="px-2 py-2">학과코드</th>
              </tr>
            </thead>
            <tbody>
              {selectedU ? (
                dList.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-2 py-4 text-center text-sm text-gray-500">등록된 학과 없음</td>
                  </tr>
                ) : (
                  dList.map((d) => (
                    <tr key={d} className="border-t text-sm dark:border-gray-800">
                      <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{d}</td>
                      <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{universities[selectedU].depts[d]}</td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={2} className="px-2 py-4 text-center text-sm text-gray-500">대학을 선택하세요</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EditRowModal({
  row,
  universities,
  branches,
  onClose,
  onSave,
}: {
  row: AdmitRow;
  universities: Record<string, { code: string; depts: Record<string, string> }>;
  branches: string[];
  onClose: () => void;
  onSave: (patch: Pick<AdmitRow, "name" | "university" | "dept" | "track" | "branch" | "universityCode" | "deptCode">) => void;
}) {
  const [name, setName] = useState(row.name);
  const [univ, setUniv] = useState(row.university);
  const [dept, setDept] = useState(row.dept);
  const [track, setTrack] = useState<"수시" | "정시">(row.track);
  const [branch, setBranch] = useState(row.branch);

  const univSuggestions = useMemo(() => Object.keys(universities), [universities]);
  const deptSuggestions = useMemo(() => {
    const u = universities[univ];
    return u ? Object.keys(u.depts) : [];
  }, [universities, univ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">항목 수정</h3>

        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <Combobox
            label="합격 대학"
            value={univ}
            setValue={setUniv}
            suggestions={univSuggestions}
            placeholder="예: 서울대학교"
            required
            restrictToList
          />

          <Combobox
            label="학과"
            value={dept}
            setValue={setDept}
            suggestions={deptSuggestions}
            placeholder="예: 경영학과"
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium">전형</label>
            <div className="flex gap-3">
              {(["수시","정시"] as const).map(t => (
                <label key={t} className="inline-flex items-center gap-2 text-sm">
                  <input type="radio" name="edit-track" value={t} checked={track===t} onChange={()=>setTrack(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">지점</label>
            <select
              value={branch}
              onChange={(e)=>setBranch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700">
            취소
          </button>
          <button
            onClick={() => {
              if (!name.trim() || !univ.trim() || !dept.trim()) {
                alert("이름/대학/학과를 모두 입력하세요.");
                return;
              }
              if (!universities[univ]) {
                alert("합격 대학은 목록에서만 선택 가능합니다.");
                return;
              }
              const uniCode = universities[univ]?.code ?? "";
              const depCode = universities[univ]?.depts?.[dept] ?? "000";
              onSave({
                name: name.trim(),
                university: univ.trim(),
                dept: dept.trim(),
                track,
                branch,
                universityCode: uniCode,
                deptCode: depCode,
              });
            }}
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
