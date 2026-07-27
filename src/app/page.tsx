'use client';

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { AdmitRow, AdmitStatus, isUniversitiesMap } from "@/types/admit";
import { BRANCHES, INIT_UNIVERSITIES, HOWTO_URL } from "@/constants/masterData";
import { buildExportComparator, toApplicant } from "@/utils/comparator";
import { buildCSV, downloadFile } from "@/utils/csv";
import { computeStats } from "@/utils/stats";
import { runCsvTests, runCsvExtraTests, runDashboardTests } from "@/utils/testRunners";

import { Combobox } from "@/components/Combobox";
import { FileDrop } from "@/components/FileDrop";
import { StatusBadge } from "@/components/StatusBadge";
import { LoginForm } from "@/components/LoginForm";
import { UniversityManager } from "@/components/UniversityManager";
import { EditRowModal } from "@/components/EditRowModal";
import { FilePreviewModal } from "@/components/FilePreviewModal";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AdmitCollectorApp() {
  // 기본 테마는 라이트 모드로 고정
  useEffect(() => {
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
  }, []);

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
    <div className="min-h-screen bg-white font-sans text-slate-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 px-5 shadow-[0_2px_12px_rgba(7,29,73,0.06)] backdrop-blur-md md:px-10 xl:px-12">
        <div className="relative flex h-[68px] w-full items-center justify-between">
          <div className="flex shrink-0 items-center gap-4">
            <button onClick={() => setTab("upload")} className="flex items-center text-left" aria-label="홈으로">
              <Image
                src="/etoos247-bi.png"
                alt="이투스247학원"
                width={330}
                height={111}
                priority
                className="h-8 w-auto"
              />
            </button>
            <span className="h-5 w-px bg-slate-300" aria-hidden="true" />
            <span className="hidden whitespace-nowrap text-[13px] font-semibold text-[#315d81] lg:inline">
              합격자 관리 시스템
            </span>
          </div>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 text-[13px] font-bold text-[#071d49] md:flex">
            <button
              onClick={() => setTab("upload")}
              className={classNames("hover:text-[#3f9fdb]", tab === "upload" && "text-[#3f9fdb]")}
            >
              합격자 등록
            </button>
            <button
              onClick={() => setTab("status")}
              className={classNames("hover:text-[#3f9fdb]", tab === "status" && "text-[#3f9fdb]")}
            >
              합격 현황
            </button>
            {isAdmin && (
              <button
                onClick={() => setTab("admin")}
                className={classNames("hover:text-[#3f9fdb]", tab === "admin" && "text-[#3f9fdb]")}
              >
                대시보드
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름 또는 대학 검색"
                aria-label="합격자 검색"
                className="w-48 rounded-full border border-slate-200 bg-[#f7f9fb] px-4 py-2 text-[11px] font-medium text-[#071d49] placeholder:text-slate-400 focus:border-[#3f9fdb] focus:bg-white focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
            </div>

            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="rounded-full border border-[#071d49] bg-white px-5 py-2 text-[11px] font-bold text-[#071d49] hover:bg-[#071d49] hover:text-white"
              >
                로그아웃
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="rounded-full border border-[#071d49] bg-white px-5 py-2 text-[11px] font-bold text-[#071d49] hover:bg-[#071d49] hover:text-white"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="air-hero relative px-5 pb-16 pt-10 dark:from-slate-900 dark:via-gray-900 dark:to-slate-950 md:px-10 md:pb-20 xl:px-12">
        <div className="w-full">
          {/* 대한항공 항공권 예매 / 나의 여행 / 체크인 / 출도착 탭바 (위젯 카드 위에 이음새 연결) */}
          <div className="relative z-10 mx-auto -mb-px w-64 overflow-hidden rounded-t-2xl border border-b-0 border-white/70 bg-white shadow-[0_-4px_18px_rgba(7,29,73,0.05)]">
            <button
              onClick={() => setTab("upload")}
              className={classNames(
                "flex w-full items-center justify-center gap-2 px-5 py-4 text-xs font-bold",
                tab === "upload"
                  ? "bg-white text-[#071d49] dark:bg-gray-900 dark:text-white"
                  : "text-[#425570] hover:bg-white/80 dark:bg-gray-800/50 dark:text-gray-300"
              )}
            >
              <span aria-hidden="true">✈</span> 합격자 등록
            </button>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-[0_12px_38px_rgba(7,29,73,0.08)] dark:bg-gray-900 md:p-7">
            {/* 서브 옵션 바 (예매/마일리지 예매, 왕복/편도, 가까운 날짜 함께 조회 라인) */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-3">
                {/* 수집/마스터 선택 필 그룹 */}
                <div className="flex rounded-full bg-[#f3f6f9] p-1 dark:bg-gray-800">
                  <button className="rounded-full bg-[#071d49] px-4 py-1.5 text-[11px] font-bold text-white">
                    일반 등록
                  </button>
                  <button className="rounded-full px-4 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#071d49] dark:text-gray-400">
                    일괄 등록
                  </button>
                </div>

                {/* 수시 / 정시 전형 필 선택 */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTrack("수시")}
                    className={classNames(
                      "rounded-full px-4 py-1.5 text-[11px] font-bold",
                      track === "수시"
                        ? "bg-[#e5f5fc] text-[#1676ad]"
                        : "text-slate-500 hover:bg-slate-100 dark:text-gray-400"
                    )}
                  >
                    수시
                  </button>
                  <button
                    onClick={() => setTrack("정시")}
                    className={classNames(
                      "rounded-full px-4 py-1.5 text-[11px] font-bold",
                      track === "정시"
                        ? "bg-[#e5f5fc] text-[#1676ad]"
                        : "text-slate-500 hover:bg-slate-100 dark:text-gray-400"
                    )}
                  >
                    정시
                  </button>
                </div>
              </div>

              {/* 우측 지점 선택 & 체크박스 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#071d49] dark:text-sky-300">지점</span>
                  <select
                    value={branch ?? ""}
                    onChange={(e) => setBranch(e.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#071d49] focus:border-[#3f9fdb] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b} 지점
                      </option>
                    ))}
                  </select>
                </div>

                {isAdmin && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={viewAllBranches}
                      onChange={(e) => setViewAllBranches(e.target.checked)}
                      className="accent-[#0077c8]"
                    />
                    전체 지점 조회 ⓘ
                  </label>
                )}
              </div>
            </div>

            {/* 5. 대한항공 시그니처 1줄 수평 수집 폼 행 (PUS ⇄ To Departure / Date / Passenger / Class / Search CTA) */}
            {tab === "upload" && (
              <div className="rounded-lg border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900/80">
                <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-gray-800 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                  {/* Column 1: PUS ⇄ To (학생 성명 / 대학) (4열) */}
                  <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-gray-800 lg:col-span-4">
                    {/* PUS 부산 (학생 성명) */}
                    <div className="flex min-h-[72px] flex-col justify-center px-4 py-2">
                      <div className="text-[10px] font-bold tracking-wide text-slate-500">
                        학생 성명
                      </div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="홍길동"
                        className="w-full bg-transparent text-base font-bold leading-6 text-[#071d49] placeholder:font-normal placeholder:text-slate-300 focus:outline-none dark:text-gray-100"
                      />
                    </div>

                    {/* To 도착지 (합격 대학) */}
                    <div>
                      <Combobox
                        label="합격 대학"
                        value={univ}
                        setValue={setUniv}
                        suggestions={univSuggestions}
                        placeholder="서울대학교"
                        required
                        restrictToList
                        subLabel={univ ? `코드 ${universities[univ]?.code ?? ""}` : undefined}
                      />
                    </div>
                  </div>

                  {/* Column 2: 학과 (출발일 가는날 ~ 오는날 위치) (3열) */}
                  <div className="lg:col-span-3">
                    <Combobox
                      label="학과"
                      value={dept}
                      setValue={setDept}
                      suggestions={deptSuggestions}
                      placeholder="의예과"
                      required
                      subLabel={dept && univ ? `코드 ${(universities[univ]?.depts ?? {})[dept] ?? "000"}` : undefined}
                    />
                  </div>

                  {/* Column 3: 좌석 등급 / 합격증 첨부 (3열) */}
                  <div className="lg:col-span-3">
                    <FileDrop file={file} setFile={setFile} error={fileError} />
                  </div>

                  {/* Column 4: 대한항공 시그니처 Sky Blue 알약 검색 버튼 (2열) */}
                  <div className="flex items-center justify-center p-3 lg:col-span-2">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full rounded-full bg-[#4da8dd] px-6 py-4 text-xs font-bold text-white shadow-[0_4px_12px_rgba(63,159,219,0.24)] hover:bg-[#2789c3] disabled:opacity-50"
                    >
                      {submitting ? "제출 중..." : "합격증 등록"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="w-full px-5 py-10 md:px-10 md:py-14 xl:px-12">
        <div className="air-banner mb-12 flex min-h-28 flex-col items-center justify-center px-6 py-7 text-center text-[#071d49] dark:bg-gray-900 dark:text-sky-300">
          <div>
            <h3 className="text-sm font-bold">새로워진 합격자 취합 서비스를 한눈에</h3>
            <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-gray-400">지점 실적과 증빙 합격증을 안전하게 등록하고 실시간으로 확인해 보세요.</p>
          </div>
          <button
            onClick={() => setTab("status")}
            className="mt-4 rounded-full border border-[#071d49] bg-white/40 px-5 py-2 text-[10px] font-bold text-[#071d49] hover:bg-[#071d49] hover:text-white dark:bg-gray-800 dark:text-sky-300"
          >
            합격 현황 바로가기
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_2px_10px_rgba(7,29,73,0.04)] dark:border-gray-800 dark:bg-gray-900">
            <div className="stat-art flex h-40 items-center justify-center bg-gradient-to-br from-[#dff5fe] via-[#a8def5] to-[#6dbde6]">
              <div className="relative z-10 flex h-20 w-24 items-end justify-center gap-2 rounded-md bg-white/75 p-4 shadow-lg backdrop-blur-sm" aria-hidden="true">
                <span className="h-5 w-3 rounded-t bg-[#8cccea]" />
                <span className="h-9 w-3 rounded-t bg-[#50a8d7]" />
                <span className="h-12 w-3 rounded-t bg-[#071d49]" />
              </div>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-semibold text-slate-500">통계 한눈에 보기</span>
              <h4 className="mt-1 text-[13px] font-bold text-[#071d49] dark:text-white">
                총 합격증 제출 실적: {stats.total}건
              </h4>
              <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-gray-400">
                {branch ?? "전체"} 지점 등록 실적이 실시간으로 가공되어 집계됩니다.
              </p>
            </div>
          </article>

          <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_2px_10px_rgba(7,29,73,0.04)] dark:border-gray-800 dark:bg-gray-900">
            <div className="stat-art flex h-40 items-center justify-center bg-gradient-to-br from-[#e8f8f4] via-[#bce9dc] to-[#72c7b1]">
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-[12px] border-white/70 text-2xl font-bold text-white shadow-lg" aria-hidden="true">
                {stats.approvedRate}%
              </div>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-semibold text-slate-500">검토 및 승인율</span>
              <h4 className="mt-1 text-[13px] font-bold text-[#071d49] dark:text-white">
                승인 완료율: {stats.approvedRate}% ({stats.byStatus["승인"]}건)
              </h4>
              <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-gray-400">
                관리자 검토를 통해 승인된 데이터만 CSV 파일로 정상 추출됩니다.
              </p>
            </div>
          </article>

          <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_2px_10px_rgba(7,29,73,0.04)] dark:border-gray-800 dark:bg-gray-900">
            <div className="stat-art flex h-40 items-center justify-center bg-gradient-to-br from-[#eef2ff] via-[#cbd5f4] to-[#7890ce]">
              <div className="relative z-10 rotate-[-7deg] rounded-md bg-[#071d49] px-7 py-5 text-center text-white shadow-xl" aria-hidden="true">
                <span className="block text-[9px] tracking-[0.25em] text-[#89d1f2]">ADMIT PASS</span>
                <span className="mt-2 block text-xl font-bold">247</span>
              </div>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-semibold text-slate-500">주요 대학 실적</span>
              <h4 className="mt-1 text-[13px] font-bold text-[#071d49] dark:text-white">
                상위 대학: {stats.topUniversities[0]?.name || "데이터 준비중"}
              </h4>
              <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-gray-400">
                의약학 계열 및 서울 주요 대학 합격자 자동 분류 정렬 포함.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="w-full px-5 py-10 md:px-10 xl:px-12">
        <div className="bg-white dark:bg-gray-900">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-bold text-[#071d49] dark:text-white">알려드립니다</h3>
              <p className="mt-1 text-[10px] text-slate-500">실시간 지점별 합격 등록 내역</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex rounded-full border border-slate-200 bg-white p-1 dark:bg-gray-800">
                {(["전체", "승인", "대기중", "반려"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={classNames(
                      "rounded-full px-4 py-1 text-[10px] font-bold",
                      statusFilter === st
                        ? "bg-[#071d49] text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-gray-400"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                onClick={() => exportCSV(true)}
                className="rounded-full border border-[#071d49] bg-white px-5 py-2 text-[10px] font-bold text-[#071d49] hover:bg-[#071d49] hover:text-white"
              >
                승인건 CSV 추출
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[11px]">
              <thead className="border-y border-slate-200 bg-[#f8fafc]">
                <tr className="font-bold text-[#071d49]">
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
                    <td colSpan={isAdmin ? 10 : 9} className="border-b border-slate-100 py-12 text-center text-xs font-medium text-slate-400">
                      등록된 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr
                      key={r.id}
                      className="group border-b border-slate-100 bg-white hover:bg-[#f6fbfe] dark:border-gray-800 dark:bg-gray-900"
                    >
                      <td className="px-3 py-4">
                        <StatusBadge s={r.status} reason={r.rejectReason} />
                      </td>
                      <td className="px-3 py-4 font-bold text-[#071d49] dark:text-gray-100">{r.name}</td>
                      <td className="px-3 py-4 font-bold text-slate-800 dark:text-gray-200">{r.university}</td>
                      <td className="px-3 py-4 font-mono font-bold text-[#0077c8]">{r.universityCode || "—"}</td>
                      <td className="px-3 py-4 font-bold text-slate-800 dark:text-gray-200">{r.dept}</td>
                      <td className="px-3 py-4 font-mono font-bold text-[#0077c8]">{r.deptCode || "000"}</td>
                      <td className="px-3 py-4 font-bold text-[#071d49]">{r.track}</td>
                      <td className="px-3 py-4 font-semibold text-slate-600">{r.branch}</td>
                      <td className="px-3 py-4">
                        {r.fileUrl ? (
                          <button
                            onClick={() => setPreviewRow(r)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#cde2f5] bg-[#eef8fd] px-3 py-1 text-[10px] font-bold text-[#1676ad] hover:bg-[#3f9fdb] hover:text-white"
                          >
                            증빙서류
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
      </section>

      {/* 8. 관리자 센터 탭일 때 매니저 모듈 */}
      {tab === "admin" && (
        <section className="w-full px-5 py-6 md:px-10 xl:px-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-gray-900">
            <UniversityManager
              universities={universities}
              onUpsertUniversity={upsertUniversity}
              onUpsertDept={upsertDept}
            />
          </div>
        </section>
      )}

      <section className="mt-10 bg-[#dff2fb] px-5 py-10 dark:bg-slate-900 md:px-10 xl:px-12">
        <div className="w-full">
        <h3 className="mb-5 text-sm font-bold text-[#071d49] dark:text-sky-300">
          합격자 관리를 위한 빠른 메뉴
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <button
            onClick={() => exportCSV(true)}
            className="flex min-h-24 flex-col items-center justify-center rounded-md bg-white/70 p-4 font-bold text-[#071d49] hover:bg-white hover:shadow-sm"
          >
            <span className="text-xl" aria-hidden="true">▥</span>
            <span className="mt-2 text-[10px]">승인 CSV 추출</span>
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
            className="flex min-h-24 flex-col items-center justify-center rounded-md bg-white/70 p-4 font-bold text-[#071d49] hover:bg-white hover:shadow-sm"
          >
            <span className="text-xl" aria-hidden="true">▦</span>
            <span className="mt-2 text-[10px]">대학/학과 코드</span>
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
            className="flex min-h-24 flex-col items-center justify-center rounded-md bg-white/70 p-4 font-bold text-[#071d49] hover:bg-white hover:shadow-sm"
          >
            <span className="text-xl" aria-hidden="true">⇅</span>
            <span className="mt-2 text-[10px]">정렬 미리보기</span>
          </button>
          <button
            onClick={runCsvTests}
            className="flex min-h-24 flex-col items-center justify-center rounded-md bg-white/70 p-4 font-bold text-[#071d49] hover:bg-white hover:shadow-sm"
          >
            <span className="text-xl" aria-hidden="true">✓</span>
            <span className="mt-2 text-[10px]">유닛 테스트</span>
          </button>
          <a
            href={HOWTO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-24 flex-col items-center justify-center rounded-md bg-white/70 p-4 font-bold text-[#071d49] hover:bg-white hover:shadow-sm"
          >
            <span className="text-xl" aria-hidden="true">▤</span>
            <span className="mt-2 text-[10px]">이용 가이드</span>
          </a>
        </div>
        </div>
      </section>

      {/* 10. 플로팅 대한항공 AI 챗봇 오마주 버튼 (+ 이용 가이드) */}
      <a
        href={HOWTO_URL}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-7 right-7 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#3346ad] to-[#147dc2] px-4 py-3 text-[10px] font-bold text-white shadow-xl hover:-translate-y-0.5"
      >
        <span className="text-sm">✦</span> AI 도움말
      </a>

      {/* 11. 대한항공 멀티컬럼 푸터 */}
      <footer className="border-t border-slate-100 bg-white px-5 py-12 text-[10px] text-slate-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 md:px-10 xl:px-12">
        <div className="w-full">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            <div>
              <h5 className="font-bold text-[#071d49] dark:text-sky-300">회사소개</h5>
              <ul className="mt-2 space-y-1.5 text-[11px] font-semibold">
                <li>ETOOS ECI 소개</li>
                <li>이투스247 학원</li>
                <li>지점 네트워크</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-[#071d49] dark:text-sky-300">고객지원</h5>
              <ul className="mt-2 space-y-1.5 text-[11px] font-semibold">
                <li>공지사항</li>
                <li>자주 묻는 질문</li>
                <li>시스템 가이드</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-[#071d49] dark:text-sky-300">약관 및 규정</h5>
              <ul className="mt-2 space-y-1.5 text-[11px] font-semibold">
                <li className="font-black text-[#0077c8]">개인정보 처리방침</li>
                <li>이용 약관</li>
                <li>운영 및 고지사항</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-[#071d49] dark:text-sky-300">기타 안내</h5>
              <ul className="mt-2 space-y-1.5 text-[11px] font-semibold">
                <li>관리자 로그인</li>
                <li>CSV 엑스포트 규칙</li>
                <li>사이트맵</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-[#071d49] dark:text-sky-300">주요 지점</h5>
              <ul className="mt-2 space-y-1.5 text-[11px] font-semibold">
                <li>강남 / 마포 / 목동</li>
                <li>분당 / 일산 / 대구</li>
                <li>부산 / 광주 / 대전</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 dark:border-gray-800">
            <p className="font-semibold text-[#071d49] dark:text-sky-300">
              (주)이투스ECI | 대표: 이투스ECI | 주소: 서울특별시 강남구 테헤란로 | 전화: 1588-2001
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Copyright ⓒ ETOOS ECI Co.,Ltd. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* 모달 팝업 */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00256c]/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:bg-gray-900">
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
  );
}
