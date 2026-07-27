'use client';

import React, { useMemo, useState, useEffect } from "react";
import { AdmitRow, AdmitStatus, isUniversitiesMap } from "@/types/admit";
import { BRANCHES, INIT_UNIVERSITIES, HOWTO_URL } from "@/constants/masterData";
import { buildExportComparator, toApplicant } from "@/utils/comparator";
import { buildCSV, downloadFile } from "@/utils/csv";
import { computeStats } from "@/utils/stats";
import { runCsvTests, runCsvExtraTests, runDashboardTests } from "@/utils/testRunners";

import { Combobox } from "@/components/Combobox";
import { FileDrop } from "@/components/FileDrop";
import { BranchSelector } from "@/components/BranchSelector";
import { StatusBadge } from "@/components/StatusBadge";
import { LoginForm } from "@/components/LoginForm";
import { UniversityManager } from "@/components/UniversityManager";
import { EditRowModal } from "@/components/EditRowModal";
import { FilePreviewModal } from "@/components/FilePreviewModal";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AdmitCollectorApp() {
  // 테마 (다크/라이트)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
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

  // 권한/로그인
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // 지점
  const [branch, setBranch] = useState<string | null>(BRANCHES[0]);

  useEffect(() => {
    const saved = localStorage.getItem("admit_branch");
    if (saved && BRANCHES.includes(saved)) {
      setBranch(saved);
    }
  }, []);

  useEffect(() => {
    if (branch) {
      localStorage.setItem("admit_branch", branch);
    }
  }, [branch]);

  // 마스터 데이터
  const [universities, setUniversities] = useState(INIT_UNIVERSITIES);

  useEffect(() => {
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

  // 제출된 행
  const [rows, setRows] = useState<AdmitRow[]>([]);
  const [editRow, setEditRow] = useState<AdmitRow | null>(null);
  const [previewRow, setPreviewRow] = useState<AdmitRow | null>(null);

  // 탭
  const [tab, setTab] = useState<"upload" | "status" | "admin">("upload");

  // 관리자 보기 및 검색 필터
  const [viewAllBranches, setViewAllBranches] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"전체" | AdmitStatus>("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // 업로드 폼 상태
  const [name, setName] = useState("");
  const [univ, setUniv] = useState("");
  const [dept, setDept] = useState("");
  const [track, setTrack] = useState<"수시" | "정시">("수시");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [fileError, setFileError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Toast
  type ToastItem = { id: string; msg: string };
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (msg: string, ms = 2400) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, msg }]);
    window.setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, ms);
  };

  // 로그인 영구화
  useEffect(() => {
    const tk = localStorage.getItem("admit_token");
    if (tk === "admin_token_v1") setIsAdmin(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admit_token");
    setIsAdmin(false);
    setTab("upload");
    pushToast("로그아웃 되었습니다.");
  };

  // 목록 재조회
  useEffect(() => {
    (async () => {
      const q = new URLSearchParams();
      if (!(isAdmin && viewAllBranches) && branch) q.set("branch", branch);
      const res = await fetch(`/api/admits?${q.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) setRows(json.rows);
    })();
  }, [branch, isAdmin, viewAllBranches, tab]);

  const univSuggestions = useMemo(() => Object.keys(universities), [universities]);
  const deptSuggestions = useMemo(() => {
    const u = universities[univ];
    return u ? Object.keys(u.depts) : [];
  }, [universities, univ]);

  const getCodes = (uName: string, dName: string) => {
    const uEntry = universities[uName];
    const universityCode = uEntry?.code ?? "";
    const deptCode = uEntry?.depts?.[dName] ?? "000";
    return { universityCode, deptCode };
  };

  const handleSubmit = async () => {
    setFileError(false);

    if (!file) {
      setFileError(true);
      alert("합격증 파일은 필수 항목입니다. 업로드 후 제출해 주세요.");
      return;
    }
    if (!branch) {
      alert("지점을 먼저 선택해 주세요.");
      return;
    }
    if (!name.trim() || !univ.trim() || !dept.trim()) {
      alert("이름, 대학, 학과를 모두 입력해 주세요.");
      return;
    }
    if (!universities[univ.trim()]) {
      alert("합격 대학은 목록에서 선택한 항목만 제출할 수 있습니다.");
      return;
    }

    setSubmitting(true);
    const { universityCode, deptCode } = getCodes(univ.trim(), dept.trim());

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const folder = `admit/${branch}/${yyyy}/${mm}/${dd}`;

    const baseName = `${name.trim()}_${univ.trim()}_${yyyy}${mm}${dd}`.replace(/[^\w\-가-힣._]/g, "_");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("publicId", baseName);

    try {
      const up = await fetch("/api/upload/cloudinary", {
        method: "POST",
        body: formData,
      });

      if (!up.ok) {
        const errJson = await up.json().catch(() => ({}));
        console.error("Upload error:", errJson);
        alert(errJson.error || "파일 업로드에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      const upJson: {
        ok: boolean;
        message?: string;
        file: { secure_url: string; public_id: string };
      } = await up.json();

      const cloud = upJson.file;

      const metaRes = await fetch("/api/admits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          university: univ.trim(),
          universityCode,
          dept: dept.trim(),
          deptCode,
          track,
          branch,
          fileUrl: cloud.secure_url,
          filePublicId: cloud.public_id,
        }),
      });

      const metaJson = await metaRes.json();
      if (!metaRes.ok || !metaJson?.ok) {
        console.error("Meta save error:", metaJson);
        alert("서버 저장에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      const saved = metaJson.row as AdmitRow;
      setRows((rs) => [saved, ...rs]);

      setName("");
      setUniv("");
      setDept("");
      setTrack("수시");
      setFile(undefined);

      pushToast(upJson.message || "✅ 제출이 완료되었습니다. 검토가 진행됩니다.");
    } catch (err) {
      console.error("❌ Submit exception:", err);
      alert("업로드 중 오류가 발생했습니다. 네트워크를 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const setRowStatus = async (id: string, s: AdmitStatus, reason?: string) => {
    try {
      const ok = await fetch(`/api/admits/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admit_token") || ""}`,
        },
        body: JSON.stringify({ status: s, reason }),
      });

      if (!ok.ok) throw new Error(`HTTP ${ok.status}`);

      setRows((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, status: s, rejectReason: s === "반려" ? (reason || r.rejectReason) : undefined } : r
        )
      );
      pushToast(`✅ 상태가 '${s}'(으)로 변경되었습니다.`);
    } catch (e) {
      setRows((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, status: s, rejectReason: s === "반려" ? (reason || r.rejectReason) : undefined } : r
        )
      );
      pushToast("⚠️ 로컬 상태가 반영되었습니다.");
      console.warn("setRowStatus fallback:", e);
    }
  };

  const upsertUniversity = (uName: string, code: string) => {
    setUniversities((m) => ({ ...m, [uName]: m[uName] ? { ...m[uName], code } : { code, depts: {} } }));
    pushToast(`✅ ${uName} 대학 정보가 저장되었습니다.`);
  };

  const upsertDept = (uName: string, dName: string, dCode: string) => {
    setUniversities((m) => ({
      ...m,
      [uName]: {
        code: m[uName]?.code ?? "",
        depts: { ...(m[uName]?.depts ?? {}), [dName]: dCode || "000" },
      },
    }));
    pushToast(`✅ ${uName} > ${dName} 학과 정보가 저장되었습니다.`);
  };

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => (isAdmin && viewAllBranches ? true : r.branch === branch))
      .filter((r) => (statusFilter === "전체" ? true : r.status === statusFilter))
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.university.toLowerCase().includes(q) ||
          r.dept.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q)
        );
      });
  }, [rows, isAdmin, viewAllBranches, branch, statusFilter, searchQuery]);

  const stats = useMemo(() => computeStats(filteredRows), [filteredRows]);

  const exportCSV = (onlyApproved: boolean = true) => {
    const target = onlyApproved
      ? filteredRows.filter((r) => r.status === "승인")
      : filteredRows;

    if (target.length === 0) {
      alert(onlyApproved ? "승인 상태의 데이터가 없습니다." : "내보낼 데이터가 없습니다.");
      return;
    }

    const rowsForSort = target.map((row, idx) => ({
      row,
      app: toApplicant(row),
      idx,
    }));

    const cmp = buildExportComparator();
    rowsForSort.sort((a, b) => {
      const c = cmp(a.app, b.app);
      return c !== 0 ? c : a.idx - b.idx;
    });

    const sortedRows = rowsForSort.map((x) => x.row);
    const csv = buildCSV(sortedRows);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    const filename = onlyApproved
      ? `etoos247-admit-approved-${y}${m}${d}.csv`
      : `etoos247-admit-all-${y}${m}${d}.csv`;

    downloadFile(filename, csv);
    pushToast(`📥 ${sortedRows.length}건의 승인 데이터가 다운로드되었습니다.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#cce4f7] via-[#eaf3fa] to-[#f0f6fa] text-slate-900 dark:from-slate-950 dark:via-gray-950 dark:to-gray-900 dark:text-gray-100 font-sans">
      {/* 최상단 대한항공 스타일 미니 우측 메뉴 바 */}
      <div className="border-b border-[#cde2f5]/60 bg-white/40 px-4 py-1.5 text-xs text-[#00256c] dark:border-gray-800 dark:bg-gray-900/40 dark:text-sky-300">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-5 font-bold">
          <a href={HOWTO_URL} target="_blank" rel="noreferrer" className="hover:underline">
            📘 이용방법 안내
          </a>
          <button onClick={toggleTheme} className="hover:underline">
            {theme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
          </button>
          {isAdmin ? (
            <button onClick={handleLogout} className="text-rose-600 hover:underline dark:text-rose-400">
              로그아웃
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="hover:underline">
              로그인
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* 대한항공 공식 브랜드 헤더 */}
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {/* 대한항공 로고 아이콘 오마주 */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00256c] text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3 21l1.5-4.5L18 12 4.5 7.5 3 3l3 9z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#0077c8] px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
                  ETOOS 247
                </span>
                <h1 className="text-2xl font-black tracking-tight text-[#00256c] dark:text-gray-100 md:text-3xl">
                  합격자 취합 센터
                </h1>
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-gray-400">
                대한항공 서비스 인터페이스 기반 입시 합격 실적 및 증빙 수집 시스템
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f7ed] px-3.5 py-1.5 text-xs font-bold text-[#047857] ring-1 ring-[#a7f3d0] dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                관리자 모드 실행 중
              </span>
            )}
          </div>
        </header>

        {/* 지점 선택 위젯 */}
        <BranchSelector current={branch} setCurrent={setBranch} branches={BRANCHES} />

        {/* 대한항공 메인 검색/예매 위젯 (Hero Main Card Widget) */}
        <div className="relative mb-8 rounded-3xl border border-[#cde2f5] bg-white p-6 shadow-[0_12px_40px_rgba(0,37,108,0.08)] backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900 md:p-8">
          {/* 대한항공 상단 메인 탭바 (라운드 펠 커스텀) */}
          <nav className="mb-6 flex flex-wrap gap-3 border-b border-[#cde2f5] pb-5 dark:border-gray-800">
            <button
              onClick={() => setTab("upload")}
              className={classNames(
                "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold transition-all shadow-sm",
                tab === "upload"
                  ? "bg-[#00256c] text-white shadow-md"
                  : "bg-[#e8f3fa] text-[#00256c] hover:bg-[#d8eaf7] dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              <span>✈️</span> 합격증 등록
            </button>
            <button
              onClick={() => setTab("status")}
              className={classNames(
                "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold transition-all shadow-sm",
                tab === "status"
                  ? "bg-[#00256c] text-white shadow-md"
                  : "bg-[#e8f3fa] text-[#00256c] hover:bg-[#d8eaf7] dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              <span>📊</span> 합격 현황 & 대시보드
            </button>
            <button
              onClick={() => (isAdmin ? setTab("admin") : alert("관리자 권한이 필요합니다."))}
              className={classNames(
                "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold transition-all shadow-sm",
                tab === "admin"
                  ? "bg-[#00256c] text-white shadow-md"
                  : "bg-[#e8f3fa] text-[#00256c] hover:bg-[#d8eaf7] dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              <span>⚙️</span> 관리자 센터
            </button>
          </nav>

          {/* 탭 1: 합격증 등록 (대한항공 대형 티켓 서식 스타일) */}
          {tab === "upload" && (
            <div className="grid gap-8 lg:grid-cols-12">
              {/* 좌측 입력 폼 (7열) */}
              <div className="flex flex-col gap-5 lg:col-span-7">
                {/* 대한항공 출발지/도착지 티켓 스타일 서식 */}
                <div className="rounded-3xl border border-[#cde2f5] bg-[#f8fbfe] p-5 dark:border-gray-800 dark:bg-gray-900/60">
                  <div className="mb-4 flex items-center justify-between border-b border-[#cde2f5] pb-3 dark:border-gray-800">
                    <span className="text-xs font-black uppercase tracking-wider text-[#00256c] dark:text-sky-300">
                      STEP 01. 학생 인적 및 합격 정보 입력
                    </span>
                    <span className="text-xs font-extrabold text-[#0077c8]">{branch ?? "지점 미선택"}</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-[#00256c] dark:text-gray-300">
                        👤 학생 이름 <span className="text-[#0077c8]">*</span>
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="예: 홍길동"
                        className="w-full rounded-2xl border border-[#cde2f5] bg-white p-4 text-sm font-bold text-[#00256c] shadow-sm focus:border-[#0077c8] focus:outline-none focus:ring-4 focus:ring-[#0077c8]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <Combobox
                      label="합격 대학"
                      icon="🏛️"
                      value={univ}
                      setValue={setUniv}
                      suggestions={univSuggestions}
                      placeholder="예: 서울대학교 (목록 내 지정된 대학 선택)"
                      required
                      restrictToList
                    />

                    <Combobox
                      label="학과"
                      icon="📚"
                      value={dept}
                      setValue={setDept}
                      suggestions={deptSuggestions}
                      placeholder="예: 경영학과 (자유 입력 지원)"
                      required
                    />

                    <div>
                      <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#00256c] dark:text-gray-300">
                        🎯 수시 / 정시 전형 구분 <span className="text-[#0077c8]">*</span>
                      </label>
                      <div className="flex gap-3">
                        {(["수시", "정시"] as const).map((t) => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => setTrack(t)}
                            className={classNames(
                              "flex-1 rounded-full py-3 text-sm font-black transition-all shadow-sm border",
                              track === t
                                ? "bg-[#00256c] text-white border-[#00256c]"
                                : "bg-white text-[#00256c] border-[#cde2f5] hover:bg-[#e8f3fa]"
                            )}
                          >
                            {t} 전형
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <FileDrop file={file} setFile={setFile} error={fileError} />
              </div>

              {/* 우측 대한항공 실시간 승권 카드 뷰 (5열) */}
              <div className="flex flex-col justify-between rounded-3xl border border-[#00256c] bg-gradient-to-br from-[#00256c] via-[#001948] to-[#001235] p-7 text-white shadow-2xl lg:col-span-5">
                <div>
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-black tracking-widest text-[#93c5fd] ring-1 ring-white/20">
                      BOARDING PASS
                    </span>
                    <span className="text-xs font-bold text-slate-300">ETOOS 247</span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">지점명</span>
                      <p className="text-xl font-black text-[#93c5fd]">{branch ?? "지점 미선택"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">학생 성명</span>
                        <p className="text-2xl font-black text-white">{name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">전형 구분</span>
                        <p className="text-lg font-black text-[#93c5fd]">{track}</p>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">합격 대학 (학교코드)</span>
                      <p className="text-lg font-black text-white">
                        {univ || "—"}
                        {univ && <span className="ml-2 font-mono text-xs font-bold text-[#93c5fd]">({universities[univ]?.code ?? "미등록"})</span>}
                      </p>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">학과 (학과코드)</span>
                      <p className="text-base font-bold text-slate-200">
                        {dept || "—"}
                        {dept && <span className="ml-2 font-mono text-xs font-bold text-[#93c5fd]">({(universities[univ]?.depts ?? {})[dept] ?? "000"})</span>}
                      </p>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">증빙 합격증 서류</span>
                      <p className="mt-0.5 text-xs font-bold text-[#93c5fd]">
                        {file ? `📄 ${file.name}` : "⚠️ 증빙 파일 미첨부"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-white/15 pt-5">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-full bg-[#0077c8] px-8 py-4 text-base font-black text-white shadow-[0_6px_20px_rgba(0,119,200,0.4)] transition-all hover:scale-[1.01] hover:bg-[#005fa3] disabled:opacity-50"
                  >
                    {submitting ? "제출 처리 중..." : "🚀 합격증 제출하기"}
                  </button>
                  <p className="mt-2.5 text-center text-[11px] font-semibold text-slate-300">
                    제출 즉시 Cloudinary 및 Google Sheets에 저장됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 탭 2: 합격 현황 & 대시보드 (대한항공 공지 및 메트릭 카드) */}
          {tab === "status" && (
            <div className="space-y-6">
              {/* 대한항공 스타일 4종 KPI 카드 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-[#cde2f5] bg-[#e8f3fa] p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-wider text-[#00256c]">
                    총 합격증 제출
                  </div>
                  <div className="mt-2 text-3xl font-black text-[#00256c]">
                    {stats.total} <span className="text-sm font-extrabold text-slate-500">건</span>
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-slate-500">
                    보기 대상: {isAdmin && viewAllBranches ? "전체 지점" : (branch ?? "미선택")}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#a7f3d0] bg-[#e6f7ed] p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#047857]">
                    <span>승인율</span>
                    <span>{stats.approvedRate}%</span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-[#047857]">
                    {stats.byStatus["승인"]}건 승인 완료
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                    <div className="h-full bg-[#10b981]" style={{ width: `${stats.approvedRate}%` }} />
                  </div>
                </div>

                <div className="rounded-3xl border border-[#cde2f5] bg-[#e8f3fa] p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-wider text-[#00256c]">
                    수시 / 정시 전형 비율
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-extrabold text-[#00256c]">
                    <span>수시 {stats.byTrack["수시"]}건</span>
                    <span>정시 {stats.byTrack["정시"]}건</span>
                  </div>
                  <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="bg-[#00256c]"
                      style={{ width: `${stats.total ? (stats.byTrack["수시"] / stats.total) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-[#0077c8]"
                      style={{ width: `${stats.total ? (stats.byTrack["정시"] / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-[#fde68a] bg-[#fff8e6] p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-wider text-[#b45309]">
                    최상위 합격 대학
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {stats.topUniversities.length === 0 ? (
                      <span className="text-xs text-slate-400">데이터 없음</span>
                    ) : (
                      stats.topUniversities.slice(0, 3).map((u) => (
                        <span key={u.name} className="rounded-full border border-[#fde68a] bg-white px-3 py-1 text-xs font-extrabold text-[#b45309] shadow-sm">
                          {u.name} <span className="font-black text-[#d97706]">×{u.count}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 대한항공 검색 및 필터 조작 바 */}
              <div className="flex flex-col gap-3 rounded-2xl border border-[#cde2f5] bg-[#f8fbfe] p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="이름, 대학, 학과, 지점 검색..."
                      className="w-full rounded-full border border-[#cde2f5] bg-white px-4 py-2 text-xs font-bold text-[#00256c] shadow-sm focus:border-[#0077c8] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="flex rounded-full border border-[#cde2f5] bg-white p-1 dark:bg-gray-900">
                    {(["전체", "승인", "대기중", "반려"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={classNames(
                          "rounded-full px-3.5 py-1 text-xs font-extrabold transition-all",
                          statusFilter === st
                            ? "bg-[#00256c] text-white shadow-sm"
                            : "text-[#00256c] hover:bg-[#e8f3fa]"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#00256c]">
                      <input
                        type="checkbox"
                        checked={viewAllBranches}
                        onChange={(e) => setViewAllBranches(e.target.checked)}
                        className="accent-[#0077c8]"
                      />
                      전체 지점 데이터 보기
                    </label>
                  )}

                  <button
                    onClick={() => exportCSV(true)}
                    className="rounded-full bg-[#047857] px-5 py-2 text-xs font-extrabold text-white shadow transition-all hover:bg-[#065f46]"
                  >
                    📥 승인건 CSV 추출
                  </button>
                </div>
              </div>

              {/* 데이터 현황 테이블 */}
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs">
                  <thead>
                    <tr className="font-extrabold text-[#00256c]">
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2">이름</th>
                      <th className="px-3 py-2">합격 대학</th>
                      <th className="px-3 py-2">학교코드</th>
                      <th className="px-3 py-2">학과</th>
                      <th className="px-3 py-2">학과코드</th>
                      <th className="px-3 py-2">전형</th>
                      <th className="px-3 py-2">지점</th>
                      <th className="px-3 py-2">증빙 파일</th>
                      {isAdmin && <th className="px-3 py-2 text-right">관리 조치</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 10 : 9} className="rounded-2xl border border-[#cde2f5] bg-white py-12 text-center text-sm font-bold text-slate-400">
                          조건에 부합하는 합격 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => (
                        <tr
                          key={r.id}
                          className="group rounded-2xl border border-[#cde2f5] bg-white shadow-sm transition-all hover:border-[#0077c8] hover:shadow-md dark:bg-gray-900"
                        >
                          <td className="rounded-l-2xl px-3 py-4">
                            <StatusBadge s={r.status} reason={r.rejectReason} />
                          </td>
                          <td className="px-3 py-4 font-black text-[#00256c] dark:text-gray-100">{r.name}</td>
                          <td className="px-3 py-4 font-bold text-slate-800 dark:text-gray-200">{r.university}</td>
                          <td className="px-3 py-4 font-mono font-bold text-[#0077c8]">{r.universityCode || "—"}</td>
                          <td className="px-3 py-4 font-bold text-slate-800 dark:text-gray-200">{r.dept}</td>
                          <td className="px-3 py-4 font-mono font-bold text-[#0077c8]">{r.deptCode || "000"}</td>
                          <td className="px-3 py-4 font-black text-[#00256c]">{r.track}</td>
                          <td className="px-3 py-4 font-semibold text-slate-600">{r.branch}</td>
                          <td className="px-3 py-4">
                            {r.fileUrl ? (
                              <button
                                onClick={() => setPreviewRow(r)}
                                className="inline-flex items-center gap-1 rounded-full border border-[#cde2f5] bg-[#e8f3fa] px-3 py-1 text-xs font-bold text-[#0077c8] hover:bg-[#0077c8] hover:text-white transition-colors"
                              >
                                👁️ 증빙서류
                              </button>
                            ) : (
                              <span className="text-slate-400">없음</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="rounded-r-2xl px-3 py-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setRowStatus(r.id, "승인")}
                                  className="rounded-full bg-[#e6f7ed] px-3 py-1 text-xs font-bold text-[#047857] hover:bg-[#10b981] hover:text-white transition-colors"
                                >
                                  승인
                                </button>
                                <button
                                  onClick={async () => {
                                    const reason = prompt("반려 사유를 입력하세요 (필수)");
                                    if (!reason || !reason.trim()) return;
                                    await setRowStatus(r.id, "반려", reason.trim());
                                  }}
                                  className="rounded-full bg-[#ffeef0] px-3 py-1 text-xs font-bold text-[#be123c] hover:bg-[#f43f5e] hover:text-white transition-colors"
                                >
                                  반려
                                </button>
                                <button
                                  onClick={() => setEditRow(r)}
                                  className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-bold text-[#b45309] hover:bg-[#f59e0b] hover:text-white transition-colors"
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
            </div>
          )}

          {/* 탭 3: 관리자 센터 */}
          {tab === "admin" && (
            <div className="space-y-8">
              <div className="rounded-3xl border border-[#cde2f5] bg-[#f8fbfe] p-6 shadow-sm">
                <UniversityManager
                  universities={universities}
                  onUpsertUniversity={upsertUniversity}
                  onUpsertDept={upsertDept}
                />
              </div>

              <div className="rounded-3xl border border-[#cde2f5] bg-[#f8fbfe] p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#cde2f5] pb-4">
                  <h3 className="text-sm font-black text-[#00256c]">
                    🛠️ 합격자 검토 및 시스템 도구
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={runCsvTests}
                      className="rounded-full bg-[#00256c] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#001948]"
                    >
                      CSV 유닛 테스트
                    </button>
                    <button
                      onClick={runCsvExtraTests}
                      className="rounded-full bg-[#00256c] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#001948]"
                    >
                      CSV 확장 테스트
                    </button>
                    <button
                      onClick={runDashboardTests}
                      className="rounded-full bg-[#00256c] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#001948]"
                    >
                      대시보드 테스트
                    </button>
                    <button
                      onClick={() => {
                        const cmp = buildExportComparator();
                        const sorted = rows
                          .map((r, idx) => ({ r, a: toApplicant(r), idx }))
                          .sort((x, y) => {
                            const c = cmp(x.a, y.a);
                            return c !== 0 ? c : x.idx - y.idx;
                          })
                          .map((x) => x.r);
                        console.log("[EXPORT PREVIEW] sorted", sorted);
                        alert("콘솔에서 입시 정렬 결과를 확인하세요 (F12 → Console)");
                      }}
                      className="rounded-full bg-[#0077c8] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#005fa3]"
                    >
                      정렬 콘솔 미리보기
                    </button>
                    <button
                      onClick={() => exportCSV(true)}
                      className="rounded-full bg-[#047857] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#065f46]"
                    >
                      승인건 CSV 추출
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs">
                    <thead>
                      <tr className="font-extrabold text-[#00256c]">
                        <th className="px-3 py-2">상태</th>
                        <th className="px-3 py-2">이름</th>
                        <th className="px-3 py-2">합격 대학</th>
                        <th className="px-3 py-2">학과</th>
                        <th className="px-3 py-2">전형</th>
                        <th className="px-3 py-2">지점</th>
                        <th className="px-3 py-2 text-right">빠른 조치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">데이터가 없습니다</td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.id} className="rounded-2xl border border-[#cde2f5] bg-white shadow-sm">
                            <td className="rounded-l-2xl px-3 py-3.5"><StatusBadge s={r.status} /></td>
                            <td className="px-3 py-3.5 font-bold text-[#00256c]">{r.name}</td>
                            <td className="px-3 py-3.5 font-bold text-slate-800">{r.university}</td>
                            <td className="px-3 py-3.5 font-bold text-slate-800">{r.dept}</td>
                            <td className="px-3 py-3.5 font-black text-[#00256c]">{r.track}</td>
                            <td className="px-3 py-3.5 font-semibold text-slate-600">{r.branch}</td>
                            <td className="rounded-r-2xl px-3 py-3.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setRowStatus(r.id, "승인")}
                                  className="rounded-full bg-[#e6f7ed] px-3 py-1 text-xs font-bold text-[#047857] hover:bg-[#10b981] hover:text-white"
                                >
                                  승인
                                </button>
                                <button
                                  onClick={() => setRowStatus(r.id, "반려")}
                                  className="rounded-full bg-[#ffeef0] px-3 py-1 text-xs font-bold text-[#be123c] hover:bg-[#f43f5e] hover:text-white"
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
            </div>
          )}
        </div>

        {/* 대한항공 하단 서비스 아이콘 그리드 ("여행의 완성을 위한 경험") */}
        <section className="mb-10">
          <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-[#00256c] dark:text-sky-300">
            ✈️ 원클릭 서비스 퀵 도구
          </h3>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-5">
            <button
              onClick={() => exportCSV(true)}
              className="flex flex-col items-center justify-center rounded-3xl border border-[#cde2f5] bg-[#e8f3fa] p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-[#d8eaf7] hover:shadow-md"
            >
              <span className="text-3xl">📊</span>
              <span className="mt-2.5 text-xs font-extrabold text-[#00256c]">승인 CSV 추출</span>
            </button>
            <button
              onClick={() => {
                if (!isAdmin) {
                  alert("관리자 로그인이 필요합니다.");
                  setShowLogin(true);
                } else {
                  setTab("admin");
                }
              }}
              className="flex flex-col items-center justify-center rounded-3xl border border-[#cde2f5] bg-[#e8f3fa] p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-[#d8eaf7] hover:shadow-md"
            >
              <span className="text-3xl">🏫</span>
              <span className="mt-2.5 text-xs font-extrabold text-[#00256c]">대학/학과 코드 관리</span>
            </button>
            <button
              onClick={() => {
                const cmp = buildExportComparator();
                const sorted = rows
                  .map((r, idx) => ({ r, a: toApplicant(r), idx }))
                  .sort((x, y) => {
                    const c = cmp(x.a, y.a);
                    return c !== 0 ? c : x.idx - y.idx;
                  })
                  .map((x) => x.r);
                console.log("[EXPORT PREVIEW] sorted", sorted);
                alert("콘솔에서 입시 정렬 결과를 확인하세요 (F12 → Console)");
              }}
              className="flex flex-col items-center justify-center rounded-3xl border border-[#cde2f5] bg-[#e8f3fa] p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-[#d8eaf7] hover:shadow-md"
            >
              <span className="text-3xl">🧪</span>
              <span className="mt-2.5 text-xs font-extrabold text-[#00256c]">정렬 콘솔 검증</span>
            </button>
            <button
              onClick={runCsvTests}
              className="flex flex-col items-center justify-center rounded-3xl border border-[#cde2f5] bg-[#e8f3fa] p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-[#d8eaf7] hover:shadow-md"
            >
              <span className="text-3xl">📋</span>
              <span className="mt-2.5 text-xs font-extrabold text-[#00256c]">CSV 유닛 테스트</span>
            </button>
            <a
              href={HOWTO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center rounded-3xl border border-[#cde2f5] bg-[#e8f3fa] p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-[#d8eaf7] hover:shadow-md"
            >
              <span className="text-3xl">📖</span>
              <span className="mt-2.5 text-xs font-extrabold text-[#00256c]">이용 가이드</span>
            </a>
          </div>
        </section>

        {/* 대한항공 공식 푸터 레이아웃 */}
        <footer className="mt-12 border-t border-[#cde2f5] pt-8 text-center text-xs font-semibold text-slate-500 dark:border-gray-800 dark:text-gray-500">
          <p className="font-extrabold text-[#00256c] dark:text-sky-300">
            이투스247 대입합격자 수집 시스템 · ETOOS ECI Co.,Ltd.
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            서울특별시 강남구 테헤란로 110-81-14794 | 대표: 이투스ECI | 전화: 1588-2001
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Copyright ⓒ ETOOS ECI Co.,Ltd. All Rights Reserved.
          </p>
        </footer>

        {/* 모달 팝업 */}
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00256c]/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl border border-[#cde2f5] bg-white p-6 shadow-2xl dark:bg-gray-900">
              <h3 className="mb-4 text-base font-black text-[#00256c] dark:text-gray-100">
                🔒 관리자 로그인
              </h3>
              <LoginForm
                onSuccess={() => {
                  localStorage.setItem("admit_token", "admin_token_v1");
                  setIsAdmin(true);
                  setTab("admin");
                  setShowLogin(false);
                  pushToast("관리자 로그인에 성공하였습니다.");
                }}
                onCancel={() => setShowLogin(false)}
              />
            </div>
          </div>
        )}

        {editRow && (
          <EditRowModal
            row={editRow}
            universities={universities}
            branches={BRANCHES}
            onClose={() => setEditRow(null)}
            onSave={async (patch) => {
              const res = await fetch(`/api/admits/${editRow.id}/edit`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
              });

              const json = await res.json().catch(() => null);
              if (!res.ok || !json?.ok) {
                alert("수정 내용이 서버에 반영되지 않았습니다.");
                console.error("edit error:", json);
                return;
              }

              setRows((rs) => rs.map((r) => (r.id === editRow.id ? { ...r, ...patch } : r)));
              setEditRow(null);
              pushToast("✅ 항목이 수정되었습니다.");
            }}
          />
        )}

        {previewRow && (
          <FilePreviewModal row={previewRow} onClose={() => setPreviewRow(null)} />
        )}

        {/* Toast Container */}
        <div className="pointer-events-none fixed right-5 top-5 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-full bg-[#00256c] px-5 py-3 text-xs font-bold text-white shadow-2xl border border-white/20 backdrop-blur-md"
            >
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
