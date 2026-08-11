'use client';

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AdmitRow, AdmitStatus } from "@/types/admit";
import {
  CUMULATIVE_ADMISSION_TOTAL,
  CUMULATIVE_BRANCH_RANKING,
  CUMULATIVE_CATEGORY_COUNTS,
  CUMULATIVE_UNIVERSITY_RANKING,
  HISTORICAL_ADMISSIONS,
} from "@/data/historicalAdmissions";

const NAVY = "#071d49";

const STATUS_COLORS: Record<AdmitStatus, string> = {
  승인: "#2f80ed",
  대기중: "#f5a623",
  반려: "#ef476f",
};

const SEOUL_MAJOR = new Set([
  "서울대학교", "연세대학교", "고려대학교", "서강대학교", "성균관대학교",
  "한양대학교", "중앙대학교", "경희대학교", "한국외국어대학교", "서울시립대학교",
  "이화여자대학교", "건국대학교", "동국대학교", "홍익대학교", "숙명여자대학교",
]);

const SCIENCE_TOKENS = ["KAIST", "POSTECH", "GIST", "DGIST", "UNIST", "과학기술원", "포항공과"];
const MEDICAL_TOKENS = ["의예", "의학", "치의", "한의", "약학", "수의"];
const ISSUE_DOT_COLORS: Record<string, string> = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  rose: "#f43f5e",
  violet: "#8b5cf6",
};

function classify(row: AdmitRow) {
  if (MEDICAL_TOKENS.some((token) => row.dept.includes(token))) return "의·치·한·약·수";
  if (SCIENCE_TOKENS.some((token) => row.university.toUpperCase().includes(token))) return "이공계 특성화";
  if (SEOUL_MAJOR.has(row.university)) return "서울 주요 대학";
  return "기타 대학";
}

function StatIcon({ kind }: { kind: "document" | "check" | "branch" }) {
  const paths = {
    document: <path d="M7 3h7l4 4v14H7V3Zm7 0v5h5M10 12h5M10 16h5" />,
    check: <path d="M21 11.1V12a9 9 0 1 1-5.3-8.2M21 4l-10 10-3-3" />,
    branch: <path d="M6 3v12a4 4 0 0 0 4 4h8M15 5l3-2 3 2M18 3v8M15 11h6" />,
  };
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[17px] font-black text-[#17233a]">
      <span className="h-5 w-1 rounded-full bg-[#ff7a00]" />{children}
    </h2>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: "current" | "cumulative";
  onChange: (value: "current" | "cumulative") => void;
}) {
  return (
    <div className="flex rounded-full bg-[#f1f4f8] p-1" aria-label="집계 기간 선택">
      {([
        ["current", "현재"],
        ["cumulative", "4개년 누적"],
      ] as const).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${
            value === mode
              ? "bg-[#071d49] text-white shadow-sm"
              : "text-slate-500 hover:text-[#071d49]"
          }`}
          aria-pressed={value === mode}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<AdmitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchView, setBranchView] = useState<"current" | "cumulative">("current");
  const [distributionView, setDistributionView] = useState<"current" | "cumulative">("current");

  useEffect(() => {
    if (localStorage.getItem("admit_token") !== "admin_token_v1") {
      window.location.replace("/");
      return;
    }
    setAuthorized(true);
    fetch("/api/admits", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => { if (data?.ok) setRows(data.rows); })
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const statuses: Record<AdmitStatus, number> = { 승인: 0, 대기중: 0, 반려: 0 };
    rows.forEach((row) => { statuses[row.status] += 1; });
    const valid = rows.filter((row) => row.status !== "반려");
    const approvedRate = valid.length ? Math.round((statuses.승인 / valid.length) * 1000) / 10 : 0;

    const branchMap = new Map<string, number>();
    const universityMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    valid.forEach((row) => {
      branchMap.set(row.branch || "지점 미입력", (branchMap.get(row.branch || "지점 미입력") || 0) + 1);
      universityMap.set(row.university || "대학 미입력", (universityMap.get(row.university || "대학 미입력") || 0) + 1);
      const category = classify(row);
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    const branches = [...branchMap.entries()].sort((a, b) => b[1] - a[1]);
    const universities = [...universityMap.entries()].sort((a, b) => b[1] - a[1]);
    const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);

    const duplicateKeys = new Map<string, number>();
    valid.forEach((row) => {
      const key = [row.branch, row.name, row.university, row.dept].join("|");
      duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);
    });
    const duplicates = [...duplicateKeys.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);

    return {
      statuses, valid, approvedRate, branches, universities, categories,
      issues: [
        { label: "승인 대기", count: statuses.대기중, tone: "amber" },
        { label: "대학·학과 코드 누락", count: valid.filter((r) => !r.universityCode || !r.deptCode || r.deptCode === "000").length, tone: "blue" },
        { label: "합격증 파일 누락", count: valid.filter((r) => !r.fileUrl).length, tone: "rose" },
        { label: "중복 의심 데이터", count: duplicates, tone: "violet" },
      ],
    };
  }, [rows]);

  if (!authorized) return <main className="min-h-screen bg-[#f4f7fb]" />;

  const total = rows.length || 1;
  const approvedDeg = (metrics.statuses.승인 / total) * 360;
  const pendingDeg = approvedDeg + (metrics.statuses.대기중 / total) * 360;
  const branchRanking = branchView === "cumulative"
    ? CUMULATIVE_BRANCH_RANKING
    : metrics.branches;
  const universityRanking = distributionView === "cumulative"
    ? CUMULATIVE_UNIVERSITY_RANKING
    : metrics.universities;
  const categoryRanking = distributionView === "cumulative"
    ? CUMULATIVE_CATEGORY_COUNTS
    : metrics.categories;
  const distributionTotal = distributionView === "cumulative"
    ? CUMULATIVE_ADMISSION_TOTAL
    : metrics.valid.length;
  const maxBranch = branchRanking[0]?.[1] || 1;
  const maxUniversity = universityRanking[0]?.[1] || 1;
  const trendValues = HISTORICAL_ADMISSIONS.map((item) => item.submissions);
  const trendMin = Math.min(...trendValues) - 8;
  const trendMax = Math.max(...trendValues) + 8;
  const trendPoints = HISTORICAL_ADMISSIONS.map((item, index) => {
    const x = 55 + index * (450 / (HISTORICAL_ADMISSIONS.length - 1));
    const y = 190 - ((item.submissions - trendMin) / (trendMax - trendMin)) * 115;
    return { ...item, x, y };
  });
  const trendPath = trendPoints.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17233a]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur md:px-10 xl:px-[100px]">
        <div className="flex h-[72px] items-center justify-between">
          <button onClick={() => { window.location.href = "/"; }} className="flex items-center gap-4">
            <Image src="/etoos247-bi.png" alt="이투스247학원" width={330} height={111} className="h-8 w-auto" priority />
            <span className="h-5 w-px bg-slate-300" />
            <span className="text-sm font-bold text-[#315d81]">관리자 대시보드</span>
          </button>
          <button onClick={() => { window.location.href = "/"; }} className="rounded-full border border-[#071d49] bg-white px-5 py-2 text-xs font-black text-[#071d49] hover:bg-[#071d49] hover:text-white">합격자 취합 화면</button>
        </div>
      </header>

      <div className="px-5 py-9 md:px-10 xl:px-[100px] xl:py-11">
        <div className="mb-8">
          <p className="mb-2 text-sm font-bold text-[#3f7ca3]">ETOOS247 ADMISSION DATA</p>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#17233a] md:text-4xl">합격자 취합 대시보드</h1>
          <p className="mt-3 text-sm font-medium text-slate-500">전국 지점의 합격자 취합 현황과 2023~2026년 실적을 한 화면에서 확인합니다.</p>
        </div>

        <section className="grid gap-5 md:grid-cols-3">
          {[
            { label: "유효 제출 건", value: `${metrics.valid.length.toLocaleString()}건`, note: "승인·대기중 합계", icon: "document" as const, color: "text-[#397ff5]", bg: "bg-[#edf4ff]" },
            { label: "승인 완료율", value: `${metrics.approvedRate}%`, note: `승인 ${metrics.statuses.승인.toLocaleString()}건`, icon: "check" as const, color: "text-[#11b981]", bg: "bg-[#e9f9f3]" },
            { label: "취합 참여 지점", value: `${metrics.branches.length.toLocaleString()}곳`, note: "유효 제출 기준", icon: "branch" as const, color: "text-[#f39a19]", bg: "bg-[#fff6e9]" },
          ].map((card) => (
            <article key={card.label} className="flex min-h-28 items-center gap-5 rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-[0_7px_22px_rgba(15,35,60,0.05)]">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bg} ${card.color}`}><StatIcon kind={card.icon} /></div>
              <div><p className="text-sm font-semibold text-slate-500">{card.label}</p><p className="mt-1 text-3xl font-black text-[#17233a]">{loading ? "—" : card.value}</p><p className="mt-1 text-xs font-medium text-slate-400">{card.note}</p></div>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_7px_22px_rgba(15,35,60,0.05)] md:p-7">
            <PanelTitle>처리 상태</PanelTitle>
            <div className="mt-7 flex flex-col items-center justify-center gap-9 sm:flex-row">
              <div className="relative grid h-48 w-48 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${STATUS_COLORS.승인} 0deg ${approvedDeg}deg, ${STATUS_COLORS.대기중} ${approvedDeg}deg ${pendingDeg}deg, ${STATUS_COLORS.반려} ${pendingDeg}deg 360deg)` }}>
                <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-inner"><div><strong className="block text-3xl font-black text-[#17233a]">{rows.length.toLocaleString()}</strong><span className="text-xs font-semibold text-slate-400">전체 제출</span></div></div>
              </div>
              <div className="w-full max-w-xs space-y-4">
                {(["승인", "대기중", "반려"] as AdmitStatus[]).map((status) => (
                  <div key={status} className="flex items-center justify-between gap-8 text-sm"><span className="flex items-center gap-2 font-bold text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />{status}</span><strong className="text-[#17233a]">{metrics.statuses[status].toLocaleString()}건 <small className="font-semibold text-slate-400">({Math.round(metrics.statuses[status] / total * 100)}%)</small></strong></div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_7px_22px_rgba(15,35,60,0.05)] md:p-7">
            <PanelTitle>4개년 합격 실적 추이</PanelTitle>
            <p className="mt-2 text-xs font-medium text-slate-400">첨부 엑셀 기준 · 합격 건수</p>
            <div className="mt-3 overflow-hidden">
              <svg viewBox="0 0 560 250" className="h-[235px] w-full" role="img" aria-label="2023년부터 2026년까지 합격 실적 추이">
                {[75, 130, 185].map((y) => <line key={y} x1="45" y1={y} x2="530" y2={y} stroke="#e8eef5" strokeDasharray="5 6" />)}
                <path d={`${trendPath} L${trendPoints[trendPoints.length - 1].x},205 L${trendPoints[0].x},205 Z`} fill="url(#area)" />
                <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#397ff5" stopOpacity=".24" /><stop offset="1" stopColor="#397ff5" stopOpacity="0" /></linearGradient></defs>
                <path d={trendPath} fill="none" stroke="#397ff5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                {trendPoints.map((point) => <g key={point.year}><circle cx={point.x} cy={point.y} r="7" fill="white" stroke="#397ff5" strokeWidth="4" /><text x={point.x} y={point.y - 18} textAnchor="middle" fill={NAVY} fontSize="16" fontWeight="800">{point.submissions.toLocaleString()}건</text><text x={point.x} y="228" textAnchor="middle" fill="#718096" fontSize="14" fontWeight="700">{point.year}년</text></g>)}
              </svg>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_7px_22px_rgba(15,35,60,0.05)] md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PanelTitle>지점별 취합 순위</PanelTitle>
              <ViewToggle value={branchView} onChange={setBranchView} />
            </div>
            <div className="mt-7 space-y-5">
              {branchRanking.slice(0, 6).map(([name, count], index) => (
                <div key={name}><div className="mb-2 flex items-center justify-between text-sm"><span className="flex items-center gap-3 font-bold"><i className={`grid h-7 w-7 place-items-center rounded-full text-xs not-italic ${index === 0 ? "bg-[#fff1d9] text-[#e68a00]" : "bg-slate-100 text-slate-500"}`}>{index + 1}</i>{name.replace(/\s*지점$/, "")}</span><strong className="text-slate-500">{count.toLocaleString()}건</strong></div><div className="ml-10 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#397ff5]" style={{ width: `${count / maxBranch * 100}%` }} /></div></div>
              ))}
              {!branchRanking.length && <p className="py-20 text-center text-sm text-slate-400">집계할 데이터가 없습니다.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_7px_22px_rgba(15,35,60,0.05)] md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PanelTitle>대학·계열별 합격 비중</PanelTitle>
              <ViewToggle value={distributionView} onChange={setDistributionView} />
            </div>
            <div className="mt-7 grid gap-8 sm:grid-cols-2">
              <div><h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-400">상위 합격 대학</h3><div className="space-y-4">{universityRanking.slice(0, 5).map(([name, count]) => <div key={name}><div className="mb-1.5 flex justify-between gap-3 text-xs font-bold"><span className="truncate">{name}</span><span>{count}건</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#7a5af8]" style={{ width: `${count / maxUniversity * 100}%` }} /></div></div>)}</div></div>
              <div><h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-400">계열 분류</h3><div className="space-y-4">{categoryRanking.map(([name, count], index) => { const colors = ["#ef476f", "#7a5af8", "#20b8cd", "#12b981"]; return <div key={name}><div className="mb-1.5 flex justify-between gap-3 text-xs font-bold"><span>{name}</span><span>{distributionTotal ? Math.round(count / distributionTotal * 100) : 0}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${distributionTotal ? count / distributionTotal * 100 : 0}%`, backgroundColor: colors[index % colors.length] }} /></div></div>; })}</div></div>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_7px_22px_rgba(15,35,60,0.05)] md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><PanelTitle>확인이 필요한 데이터</PanelTitle><p className="mt-2 text-xs font-medium text-slate-400">검토 또는 보완이 필요한 현재 등록 데이터를 자동 집계합니다.</p></div><button onClick={() => { window.location.href = "/#status-section"; }} className="text-xs font-black text-[#397ff5] hover:underline">합격 현황에서 확인 →</button></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.issues.map((issue) => <div key={issue.label} className="rounded-xl border border-slate-100 bg-[#f8fafc] px-5 py-4"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-600">{issue.label}</span><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ISSUE_DOT_COLORS[issue.tone] }} /></div><strong className="mt-3 block text-2xl font-black text-[#17233a]">{issue.count.toLocaleString()}건</strong></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
