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

  // 권한/로그인 (영구화)
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

  // 탭/지점/관리자 보기 변경 시 목록 재조회
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

      pushToast(upJson.message || "✅ 제출이 완료되었습니다. 관리자 검토가 진행됩니다.");
    } catch (err) {
      console.error("❌ Submit exception:", err);
      alert("업로드 중 오류가 발생했습니다. 네트워크 상태를 확인해 주세요.");
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
      pushToast(`✅ 상태가 '${s}'(으)로 반영되었습니다.`);
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
    pushToast(`✅ ${uName} 대학 데이터가 업데이트되었습니다.`);
  };

  const upsertDept = (uName: string, dName: string, dCode: string) => {
    setUniversities((m) => ({
      ...m,
      [uName]: {
        code: m[uName]?.code ?? "",
        depts: { ...(m[uName]?.depts ?? {}), [dName]: dCode || "000" },
      },
    }));
    pushToast(`✅ ${uName} > ${dName} 학과가 업데이트되었습니다.`);
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
    pushToast(`📥 ${sortedRows.length}건의 CSV 데이터 파일이 다운로드되었습니다.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100/80 via-sky-50/40 to-slate-50 text-slate-900 dark:from-slate-950 dark:via-gray-950 dark:to-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* 대한항공 스타일 상단 브랜드 헤더 */}
        <header className="mb-6 flex flex-col gap-4 border-b border-sky-200/50 pb-5 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white shadow-lg shadow-sky-500/25">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-sky-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  ETOOS 247
                </span>
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-gray-100 md:text-2xl">
                  대입 합격자 취합 센터
                </h1>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                지점별 수시 · 정시 대입 합격 실적 및 증빙 서류 가공 시스템
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={HOWTO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-sky-700 shadow-sm ring-1 ring-sky-200 transition-colors hover:bg-sky-50 dark:bg-gray-800 dark:text-sky-300 dark:ring-gray-700"
            >
              <span>📘</span> 이용 방법 가이드
            </a>

            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700"
            >
              {theme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  관리자 접속중
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-300 dark:bg-gray-800 dark:text-gray-200"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-black dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                관리자 로그인
              </button>
            )}
          </div>
        </header>

        {/* 지점 선택 위젯 */}
        <BranchSelector current={branch} setCurrent={setBranch} branches={BRANCHES} />

        {/* 대한항공 스타일 Hero 메인 카드 위젯 */}
        <div className="relative mb-8 rounded-3xl bg-white/80 p-5 shadow-xl ring-1 ring-sky-200/50 backdrop-blur-xl dark:bg-gray-900/80 dark:ring-gray-800 md:p-8">
          {/* 상단 메인 탭 (대한항공 항공권 예매/나의 여행 스타일) */}
          <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4 dark:border-gray-800">
            <button
              onClick={() => setTab("upload")}
              className={classNames(
                "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition-all",
                tab === "upload"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "bg-slate-100/80 text-slate-600 hover:bg-sky-50 hover:text-sky-700 dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              <span>✈️</span> 합격증 등록 (지점 수집)
            </button>
            <button
              onClick={() => setTab("status")}
              className={classNames(
                "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition-all",
                tab === "status"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "bg-slate-100/80 text-slate-600 hover:bg-sky-50 hover:text-sky-700 dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              <span>📊</span> 합격 현황 & 대시보드
            </button>
            <button
              onClick={() => (isAdmin ? setTab("admin") : alert("관리자 권한이 필요합니다. 상단에서 관리자 로그인을 진행해 주세요."))}
              className={classNames(
                "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition-all",
                tab === "admin"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "bg-slate-100/80 text-slate-600 hover:bg-sky-50 hover:text-sky-700 dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              <span>⚙️</span> 관리자 센터
            </button>
          </nav>

          {/* 탭 1: 합격증 등록 (대한항공 폼 스타일 2열) */}
          {tab === "upload" && (
            <div className="grid gap-8 lg:grid-cols-12">
              {/* 좌측 입력 서식 (7열) */}
              <div className="flex flex-col gap-4 lg:col-span-7">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                    👤 학생 이름 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 p-3.5 text-sm font-semibold text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/15 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-100"
                  />
                </div>

                <Combobox
                  label="합격 대학"
                  icon="🏛️"
                  value={univ}
                  setValue={setUniv}
                  suggestions={univSuggestions}
                  placeholder="예: 서울대학교 (목록 내 선택만 가능)"
                  required
                  restrictToList
                />

                <Combobox
                  label="학과"
                  icon="📚"
                  value={dept}
                  setValue={setDept}
                  suggestions={deptSuggestions}
                  placeholder="예: 경영학과 (자유 입력 가능)"
                  required
                />

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                    🎯 수시 / 정시 전형 <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {(["수시", "정시"] as const).map((t) => (
                      <label
                        key={t}
                        className={classNames(
                          "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-extrabold transition-all",
                          track === t
                            ? "border-sky-600 bg-sky-50 text-sky-800 shadow-sm dark:bg-sky-950/60 dark:text-sky-200"
                            : "border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="track"
                          value={t}
                          checked={track === t}
                          onChange={() => setTrack(t)}
                          className="accent-sky-600"
                        />
                        {t} 전형
                      </label>
                    ))}
                  </div>
                </div>

                <FileDrop file={file} setFile={setFile} error={fileError} />
              </div>

              {/* 우측 대한항공 탑승권 스타일 라이브 미리보기 카드 (5열) */}
              <div className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 p-6 text-white shadow-2xl lg:col-span-5">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-bold tracking-wider text-sky-300 ring-1 ring-sky-400/30">
                      LIVE PASS CARD
                    </span>
                    <span className="text-xs text-slate-400">ETOOS247 ADMIT</span>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">지점</span>
                      <p className="text-lg font-extrabold text-sky-300">{branch ?? "지점 미선택"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">학생 이름</span>
                        <p className="text-xl font-black text-white">{name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">전형</span>
                        <p className="text-base font-extrabold text-sky-200">{track}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">합격 대학 & 학교코드</span>
                      <p className="text-base font-extrabold text-white">
                        {univ || "—"}
                        {univ && <span className="ml-1.5 text-xs text-sky-300 font-mono">({universities[univ]?.code ?? "미등록"})</span>}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">학과 & 학과코드</span>
                      <p className="text-base font-bold text-slate-200">
                        {dept || "—"}
                        {dept && <span className="ml-1.5 text-xs text-sky-300 font-mono">({(universities[univ]?.depts ?? {})[dept] ?? "000"})</span>}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">첨부 증빙 파일</span>
                      <p className="text-xs font-semibold text-sky-300">
                        {file ? `📄 ${file.name}` : "⚠️ 증빙 파일 미첨부"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-white/10 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 text-base font-black text-white shadow-xl transition-all hover:scale-[1.01] hover:from-sky-400 hover:to-blue-500 disabled:opacity-50"
                  >
                    {submitting ? "제출 처리 중..." : "🚀 합격증 제출하기"}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-slate-400">
                    제출 즉시 Cloudinary 및 데이터 저장소에 안전하게 기록됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 탭 2: 합격 현황 및 통계 (대한항공 공지/통계 레이아웃) */}
          {tab === "status" && (
            <div className="space-y-6">
              {/* 비주얼 대시보드 KPI 카드 4종 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 카드 1 */}
                <div className="rounded-3xl bg-gradient-to-br from-sky-500/10 to-blue-500/5 p-5 ring-1 ring-sky-200/70 dark:ring-sky-900/50">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-sky-900 dark:text-sky-300">
                    총 제출 수
                  </div>
                  <div className="mt-2 text-3xl font-black text-slate-900 dark:text-gray-100">
                    {stats.total} <span className="text-sm font-semibold text-slate-500">건</span>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                    현재 보기: {isAdmin && viewAllBranches ? "전체 지점" : (branch ?? "미선택")}
                  </p>
                </div>

                {/* 카드 2 */}
                <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5 ring-1 ring-emerald-200/70 dark:ring-emerald-900/50">
                  <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                    <span>승인율</span>
                    <span>{stats.approvedRate}%</span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {stats.byStatus["승인"]}건 완료
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                    <div className="h-full bg-emerald-500" style={{ width: `${stats.approvedRate}%` }} />
                  </div>
                </div>

                {/* 카드 3 */}
                <div className="rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-5 ring-1 ring-indigo-200/70 dark:ring-indigo-900/50">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                    전형 비율
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-gray-300">
                    <span>수시 {stats.byTrack["수시"]}건</span>
                    <span>정시 {stats.byTrack["정시"]}건</span>
                  </div>
                  <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-gray-700">
                    <div
                      className="bg-indigo-500"
                      style={{ width: `${stats.total ? (stats.byTrack["수시"] / stats.total) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-sky-400"
                      style={{ width: `${stats.total ? (stats.byTrack["정시"] / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* 카드 4 */}
                <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 ring-1 ring-amber-200/70 dark:ring-amber-900/50">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    최상위 합격 대학
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {stats.topUniversities.length === 0 ? (
                      <span className="text-xs text-slate-400">데이터 없음</span>
                    ) : (
                      stats.topUniversities.slice(0, 3).map((u) => (
                        <span key={u.name} className="rounded-xl bg-white px-2.5 py-1 text-xs font-bold shadow-sm ring-1 ring-amber-200 dark:bg-gray-900 dark:text-amber-200 dark:ring-amber-800">
                          {u.name} <span className="text-amber-600 font-extrabold">×{u.count}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 스마트 검색 및 필터 조작 바 */}
              <div className="flex flex-col gap-3 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/70 dark:bg-gray-800/50 dark:ring-gray-700 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="이름, 대학, 학과, 지점 검색..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="flex rounded-xl bg-white p-1 ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-gray-700">
                    {(["전체", "승인", "대기중", "반려"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={classNames(
                          "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                          statusFilter === st
                            ? "bg-sky-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={viewAllBranches}
                        onChange={(e) => setViewAllBranches(e.target.checked)}
                        className="accent-sky-600"
                      />
                      전체 지점 데이터 보기
                    </label>
                  )}

                  <button
                    onClick={() => exportCSV(true)}
                    className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow transition-transform hover:scale-[1.02] hover:bg-emerald-500"
                  >
                    📥 승인건 CSV 추출
                  </button>
                </div>
              </div>

              {/* 라운드 카드 테이블 */}
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 dark:text-gray-400 font-bold">
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
                        <td colSpan={isAdmin ? 10 : 9} className="rounded-2xl bg-white py-12 text-center text-sm font-semibold text-slate-400 dark:bg-gray-900">
                          조건에 부합하는 합격 데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => (
                        <tr
                          key={r.id}
                          className="group rounded-2xl bg-white shadow-sm transition-all hover:shadow-md dark:bg-gray-900"
                        >
                          <td className="rounded-l-2xl px-3 py-3.5">
                            <StatusBadge s={r.status} reason={r.rejectReason} />
                          </td>
                          <td className="px-3 py-3.5 font-extrabold text-slate-900 dark:text-gray-100">{r.name}</td>
                          <td className="px-3 py-3.5 font-bold text-slate-800 dark:text-gray-200">{r.university}</td>
                          <td className="px-3 py-3.5 font-mono font-semibold text-slate-500 dark:text-gray-400">{r.universityCode || "—"}</td>
                          <td className="px-3 py-3.5 font-bold text-slate-800 dark:text-gray-200">{r.dept}</td>
                          <td className="px-3 py-3.5 font-mono font-semibold text-slate-500 dark:text-gray-400">{r.deptCode || "000"}</td>
                          <td className="px-3 py-3.5 font-extrabold text-sky-700 dark:text-sky-300">{r.track}</td>
                          <td className="px-3 py-3.5 font-semibold text-slate-600 dark:text-gray-400">{r.branch}</td>
                          <td className="px-3 py-3.5">
                            {r.fileUrl ? (
                              <button
                                onClick={() => setPreviewRow(r)}
                                className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300"
                              >
                                👁️ 증빙서류
                              </button>
                            ) : (
                              <span className="text-slate-400">없음</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="rounded-r-2xl px-3 py-3.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setRowStatus(r.id, "승인")}
                                  className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300"
                                >
                                  승인
                                </button>
                                <button
                                  onClick={async () => {
                                    const reason = prompt("반려 사유를 입력하세요 (필수)");
                                    if (!reason || !reason.trim()) return;
                                    await setRowStatus(r.id, "반려", reason.trim());
                                  }}
                                  className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-200 dark:bg-rose-950/80 dark:text-rose-300"
                                >
                                  반려
                                </button>
                                <button
                                  onClick={() => setEditRow(r)}
                                  className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-950/80 dark:text-amber-300"
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

          {/* 탭 3: 관리자 센터 (Admin Dashboard) */}
          {tab === "admin" && (
            <div className="space-y-8">
              {/* 대학/학과/코드 매니저 */}
              <div className="rounded-3xl bg-slate-50/70 p-5 ring-1 ring-slate-200/70 dark:bg-gray-800/40 dark:ring-gray-800">
                <UniversityManager
                  universities={universities}
                  onUpsertUniversity={upsertUniversity}
                  onUpsertDept={upsertDept}
                />
              </div>

              {/* 검토 및 배치 도구 */}
              <div className="rounded-3xl bg-slate-50/70 p-5 ring-1 ring-slate-200/70 dark:bg-gray-800/40 dark:ring-gray-800">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-gray-700">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-gray-100">
                    🛠️ 합격자 검토 및 시스템 실행 도구
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={runCsvTests}
                      className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-black dark:bg-sky-600"
                    >
                      CSV 유닛 테스트
                    </button>
                    <button
                      onClick={runCsvExtraTests}
                      className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-black dark:bg-sky-600"
                    >
                      CSV 확장 테스트
                    </button>
                    <button
                      onClick={runDashboardTests}
                      className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-black dark:bg-sky-600"
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
                      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-500"
                    >
                      정렬 콘솔 미리보기
                    </button>
                    <button
                      onClick={() => exportCSV(true)}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                    >
                      승인건 CSV 추출
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 font-bold">
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
                          <tr key={r.id} className="rounded-2xl bg-white shadow-sm dark:bg-gray-900">
                            <td className="rounded-l-2xl px-3 py-3"><StatusBadge s={r.status} /></td>
                            <td className="px-3 py-3 font-bold text-slate-900 dark:text-gray-100">{r.name}</td>
                            <td className="px-3 py-3 font-semibold text-slate-800 dark:text-gray-200">{r.university}</td>
                            <td className="px-3 py-3 font-semibold text-slate-800 dark:text-gray-200">{r.dept}</td>
                            <td className="px-3 py-3 font-bold text-sky-700 dark:text-sky-300">{r.track}</td>
                            <td className="px-3 py-3 font-semibold text-slate-600 dark:text-gray-400">{r.branch}</td>
                            <td className="rounded-r-2xl px-3 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setRowStatus(r.id, "승인")}
                                  className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300"
                                >
                                  승인
                                </button>
                                <button
                                  onClick={() => setRowStatus(r.id, "반려")}
                                  className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-200 dark:bg-rose-950/80 dark:text-rose-300"
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

        {/* 대한항공 스타일 하단 퀵 액션 모듈 (여행의 완성을 위한 경험) */}
        <section className="mb-8">
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            ⚡ 빠른 작업 및 바로가기
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <button
              onClick={() => exportCSV(true)}
              className="flex flex-col items-center justify-center rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-sky-100 transition-all hover:-translate-y-0.5 hover:bg-sky-50 dark:bg-gray-900/70 dark:ring-gray-800 dark:hover:bg-gray-800"
            >
              <span className="text-2xl">📊</span>
              <span className="mt-2 text-xs font-bold text-slate-800 dark:text-gray-200">승인 CSV 추출</span>
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
              className="flex flex-col items-center justify-center rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-sky-100 transition-all hover:-translate-y-0.5 hover:bg-sky-50 dark:bg-gray-900/70 dark:ring-gray-800 dark:hover:bg-gray-800"
            >
              <span className="text-2xl">🏫</span>
              <span className="mt-2 text-xs font-bold text-slate-800 dark:text-gray-200">대학/학과 코드 관리</span>
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
              className="flex flex-col items-center justify-center rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-sky-100 transition-all hover:-translate-y-0.5 hover:bg-sky-50 dark:bg-gray-900/70 dark:ring-gray-800 dark:hover:bg-gray-800"
            >
              <span className="text-2xl">🧪</span>
              <span className="mt-2 text-xs font-bold text-slate-800 dark:text-gray-200">정렬 미리보기</span>
            </button>
            <button
              onClick={runCsvTests}
              className="flex flex-col items-center justify-center rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-sky-100 transition-all hover:-translate-y-0.5 hover:bg-sky-50 dark:bg-gray-900/70 dark:ring-gray-800 dark:hover:bg-gray-800"
            >
              <span className="text-2xl">📋</span>
              <span className="mt-2 text-xs font-bold text-slate-800 dark:text-gray-200">CSV 유닛 테스트</span>
            </button>
            <a
              href={HOWTO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-sky-100 transition-all hover:-translate-y-0.5 hover:bg-sky-50 dark:bg-gray-900/70 dark:ring-gray-800 dark:hover:bg-gray-800"
            >
              <span className="text-2xl">📖</span>
              <span className="mt-2 text-xs font-bold text-slate-800 dark:text-gray-200">이용 가이드</span>
            </a>
          </div>
        </section>

        {/* 푸터 */}
        <footer className="mt-12 border-t border-sky-200/60 pt-6 text-center text-xs text-slate-500 dark:border-gray-800 dark:text-gray-500">
          <p className="font-semibold">이투스247 대입합격자 수집 시스템 · ETOOS ECI Co.,Ltd.</p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-gray-600">
            Copyright ⓒ ETOOS ECI Co.,Ltd. All Rights Reserved.
          </p>
        </footer>

        {/* 모달 모음 */}
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-gray-800">
              <h3 className="mb-4 text-base font-extrabold text-slate-900 dark:text-gray-100">
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
              pushToast("✅ 항목이 성공적으로 수정되었습니다.");
            }}
          />
        )}

        {previewRow && (
          <FilePreviewModal row={previewRow} onClose={() => setPreviewRow(null)} />
        )}

        {/* Toast Container */}
        <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-2xl bg-slate-900/95 px-4 py-3 text-xs font-bold text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md dark:bg-sky-950/95"
            >
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
