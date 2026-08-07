'use client';

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { AdmitRow, AdmitStatus, isUniversitiesMap } from "@/types/admit";
import { BRANCHES, INIT_UNIVERSITIES, HOWTO_URL } from "@/constants/masterData";
import { buildExportComparator, toApplicant } from "@/utils/comparator";
import { buildCSV, downloadFile } from "@/utils/csv";
import { computeStats } from "@/utils/stats";
import { runCsvExtraTests, runDashboardTests } from "@/utils/testRunners";

import { Combobox } from "@/components/Combobox";
import { FileDrop } from "@/components/FileDrop";
import { StatusBadge } from "@/components/StatusBadge";
import { LoginForm } from "@/components/LoginForm";
import { UniversityManager } from "@/components/UniversityManager";
import { EditRowModal } from "@/components/EditRowModal";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { ScholarshipSection } from "@/components/ScholarshipSection";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const UNIVERSITY_CIS: Record<string, string> = {
  서울대학교: "/seoul-national-university.png",
  연세대학교: "/yonsei-university.png",
  고려대학교: "/korea-university.png",
  성균관대학교: "/sungkyunkwan-university.png",
  가톨릭대학교: "/catholic-university.webp",
  울산대학교: "/ulsan-university.gif",
  경희대학교: "/kyung-hee-university.png",
  이화여자대학교: "/ewha-womans-university.webp",
  중앙대학교: "/chung-ang-university.webp",
  숙명여자대학교: "/sookmyung-womens-university.png",
  한양대학교: "/hanyang-university.png",
  가톨릭관동대학교: "/catholic-kwandong-university.png",
  강원대학교: "/kangwon-national-university.png",
  경상국립대학교: "/gyeongsang-national-university.png",
  고신대학교: "/kosin-university.png",
  대구가톨릭대학교: "/daegu-catholic-university.png",
  부산대학교: "/pusan-national-university.png",
  원광대학교: "/wonkwang-university.webp",
  인제대학교: "/inje-university.png",
  전남대학교: "/chonnam-national-university.png",
  전북대학교: "/jeonbuk-national-university.png",
  한림대학교: "/hallym-university.png",
  단국대학교: "/dankook-university.png",
  "단국대학교(천안)": "/dankook-university.png",
  조선대학교: "/chosun-university.png",
  가천대학교: "/gachon-university.png",
  대구한의대학교: "/daegu-haany-university.png",
  대전대학교: "/daejeon-university.png",
  동국대학교: "/dongguk-university.png",
  "동국대학교(WISE)": "/dongguk-university.png",
  동신대학교: "/dongshin-university.png",
  상지대학교: "/sangji-university.png",
  세명대학교: "/semyung-university.png",
};

type RegistrationMode = "single" | "bulk";
type BatchEntryStatus = "idle" | "uploading" | "error";
type BatchEntry = {
  id: string;
  name: string;
  univ: string;
  dept: string;
  track: "수시" | "정시";
  file?: File;
  status: BatchEntryStatus;
  error?: string;
};

type UniversityTooltipState = {
  top: number;
  left: number;
  width: number;
  columns: number;
};

function createBatchEntry(): BatchEntry {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    univ: "",
    dept: "",
    track: "수시",
    status: "idle",
  };
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
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("single");
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>(() => [createBatchEntry()]);

  // Toast
  type ToastItem = { id: string; msg: string };
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [universityTooltip, setUniversityTooltip] = useState<UniversityTooltipState | null>(null);

  const pushToast = (msg: string, ms = 2400) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, msg }]);
    window.setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, ms);
  };

  const scrollToSection = (
    sectionId: "registration-section" | "scholarship-section" | "status-section",
    nextTab?: "upload" | "status",
  ) => {
    if (nextTab) setTab(nextTab);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  const goToTop = () => {
    setTab("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showUniversityTooltip = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const width = Math.min(440, window.innerWidth - 24);
    const columns = width >= 420 ? 2 : 1;
    const estimatedHeight = 70 + Math.ceil(stats.universities.length / columns) * 30;
    const tooltipHeight = Math.min(estimatedHeight, window.innerHeight - 24);
    const belowTop = rect.bottom + 10;
    const top = belowTop + tooltipHeight <= window.innerHeight - 12
      ? belowTop
      : Math.max(12, rect.top - tooltipHeight - 10);
    const left = Math.min(
      Math.max(12, rect.right - width),
      Math.max(12, window.innerWidth - width - 12),
    );

    setUniversityTooltip({ top, left, width, columns });
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

  const uploadAdmission = async ({
    applicantName,
    universityName,
    departmentName,
    admissionTrack,
    certificate,
  }: {
    applicantName: string;
    universityName: string;
    departmentName: string;
    admissionTrack: "수시" | "정시";
    certificate: File;
  }) => {
    const selectedBranch = branch;
    if (!selectedBranch) throw new Error("지점을 먼저 선택해 주세요.");

    const { universityCode, deptCode } = getCodes(universityName, departmentName);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const folder = `admit/${selectedBranch}/${yyyy}/${mm}/${dd}`;
    const suffix = Math.random().toString(36).slice(2, 8);
    const baseName = `${applicantName}_${universityName}_${yyyy}${mm}${dd}_${suffix}`.replace(/[^\w\-가-힣._]/g, "_");

    const formData = new FormData();
    formData.append("file", certificate);
    formData.append("folder", folder);
    formData.append("publicId", baseName);

    const up = await fetch("/api/upload/cloudinary", {
      method: "POST",
      body: formData,
    });
    if (!up.ok) {
      const errJson = await up.json().catch(() => ({}));
      console.error("Upload error:", errJson);
      throw new Error(errJson.error || "파일 업로드에 실패했습니다.");
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
        name: applicantName,
        university: universityName,
        universityCode,
        dept: departmentName,
        deptCode,
        track: admissionTrack,
        branch: selectedBranch,
        fileUrl: cloud.secure_url,
        filePublicId: cloud.public_id,
      }),
    });
    const metaJson = await metaRes.json();
    if (!metaRes.ok || !metaJson?.ok) {
      console.error("Meta save error:", metaJson);
      throw new Error("서버 저장에 실패했습니다.");
    }

    return {
      saved: metaJson.row as AdmitRow,
      message: upJson.message,
    };
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
    try {
      const result = await uploadAdmission({
        applicantName: name.trim(),
        universityName: univ.trim(),
        departmentName: dept.trim(),
        admissionTrack: track,
        certificate: file,
      });
      setRows((rs) => [result.saved, ...rs]);
      setName("");
      setUniv("");
      setDept("");
      setTrack("수시");
      setFile(undefined);
      pushToast(result.message || "✅ 제출이 완료되었습니다. 검토가 진행됩니다.");
    } catch (err) {
      console.error("❌ Submit exception:", err);
      alert(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다. 네트워크를 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateBatchEntry = (id: string, patch: Partial<BatchEntry>) => {
    setBatchEntries((entries) =>
      entries.map((entry) =>
        entry.id === id
          ? { ...entry, ...patch, status: patch.status ?? "idle", error: patch.error }
          : entry
      )
    );
  };

  const addBatchEntry = () => {
    if (batchEntries.length >= 20) {
      alert("한 번에 최대 20명까지 등록할 수 있습니다.");
      return;
    }
    setBatchEntries((entries) => [...entries, createBatchEntry()]);
  };

  const removeBatchEntry = (id: string) => {
    if (submitting) return;
    setBatchEntries((entries) =>
      entries.length === 1 ? [createBatchEntry()] : entries.filter((entry) => entry.id !== id)
    );
  };

  const handleBatchSubmit = async () => {
    if (!branch) {
      alert("지점을 먼저 선택해 주세요.");
      return;
    }

    const duplicateKeys = new Set<string>();
    let hasValidationError = false;
    const validated: BatchEntry[] = batchEntries.map((entry) => {
      const applicantName = entry.name.trim();
      const universityName = entry.univ.trim();
      const departmentName = entry.dept.trim();
      let error = "";

      if (!applicantName || !universityName || !departmentName) {
        error = "성명, 대학, 학과를 모두 입력해 주세요.";
      } else if (!universities[universityName]) {
        error = "대학 목록에서 합격 대학을 선택해 주세요.";
      } else if (!entry.file) {
        error = "합격증 파일을 첨부해 주세요.";
      }

      const duplicateKey = `${applicantName}|${universityName}|${departmentName}`;
      if (!error && duplicateKeys.has(duplicateKey)) {
        error = "동일한 학생·대학·학과가 중복되었습니다.";
      }
      duplicateKeys.add(duplicateKey);
      if (error) hasValidationError = true;

      return {
        ...entry,
        name: applicantName,
        univ: universityName,
        dept: departmentName,
        status: error ? "error" : "idle",
        error: error || undefined,
      };
    });

    setBatchEntries(validated);
    if (hasValidationError) {
      alert("확인이 필요한 학생 행이 있습니다.");
      return;
    }

    setSubmitting(true);
    const savedRows: AdmitRow[] = [];
    const succeededIds = new Set<string>();
    const failureMessages = new Map<string, string>();

    for (const entry of validated) {
      setBatchEntries((entries) =>
        entries.map((item) =>
          item.id === entry.id ? { ...item, status: "uploading", error: undefined } : item
        )
      );

      try {
        const result = await uploadAdmission({
          applicantName: entry.name,
          universityName: entry.univ,
          departmentName: entry.dept,
          admissionTrack: entry.track,
          certificate: entry.file!,
        });
        savedRows.push(result.saved);
        succeededIds.add(entry.id);
      } catch (err) {
        failureMessages.set(
          entry.id,
          err instanceof Error ? err.message : "등록 중 오류가 발생했습니다."
        );
      }
    }

    if (savedRows.length > 0) {
      setRows((current) => [...savedRows.reverse(), ...current]);
    }

    if (succeededIds.size === validated.length) {
      setBatchEntries([createBatchEntry()]);
      pushToast(`✅ ${succeededIds.size}명의 합격자가 일괄 등록되었습니다.`);
    } else {
      setBatchEntries(
        validated
          .filter((entry) => !succeededIds.has(entry.id))
          .map((entry) => ({
            ...entry,
            status: "error",
            error: failureMessages.get(entry.id) || "등록 결과를 확인해 주세요.",
          }))
      );
      pushToast(
        `⚠️ ${succeededIds.size}명 등록 완료, ${validated.length - succeededIds.size}명 확인 필요`,
        4000
      );
    }

    setSubmitting(false);
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

  const deleteRow = async (row: AdmitRow) => {
    const confirmed = confirm(
      `'${row.name}' 학생의 합격 내역을 삭제하시겠습니까?\n삭제한 내용은 복구할 수 없습니다.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admits/${row.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admit_token") || ""}`,
        },
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setRows((current) => current.filter((item) => item.id !== row.id));
      pushToast("✅ 합격 내역이 삭제되었습니다.");
    } catch (error) {
      alert("합격 내역을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      console.error("delete error:", error);
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

  const showManageColumn =
    isAdmin || filteredRows.some((row) => row.status === "대기중");
  const stats = useMemo(() => computeStats(filteredRows), [filteredRows]);
  const submissionTotal =
    stats.byStatus["승인"] + stats.byStatus["대기중"];
  const topUniversity = useMemo(
    () => computeStats(filteredRows.filter((row) => row.status !== "반려")).topUniversities[0],
    [filteredRows],
  );
  const topUniversityCi = topUniversity ? UNIVERSITY_CIS[topUniversity.name] : undefined;

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
    <div className="page-font-up min-h-screen bg-white font-sans text-slate-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 px-5 shadow-[0_2px_12px_rgba(7,29,73,0.06)] backdrop-blur-md md:px-10 xl:px-[100px]">
        <div className="relative flex h-[68px] w-full items-center justify-between">
          <div className="flex shrink-0 items-center gap-4">
            <button onClick={goToTop} className="flex items-center text-left" aria-label="화면 최상단으로 이동">
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
              onClick={() => scrollToSection("registration-section", "upload")}
              className={classNames("hover:text-[#3f9fdb]", tab === "upload" && "text-[#3f9fdb]")}
            >
              합격자 등록
            </button>
            <button
              onClick={() => scrollToSection("scholarship-section", "upload")}
              className="hover:text-[#3f9fdb]"
            >
              총 1억 장학금
            </button>
            <button
              onClick={() => scrollToSection("status-section", "status")}
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

      <section
        id="registration-section"
        className="air-hero relative scroll-mt-20 px-5 pb-16 pt-10 dark:from-slate-900 dark:via-gray-900 dark:to-slate-950 md:px-10 md:pb-20 xl:px-[100px]"
      >
        <div className="w-full">
          {/* 대한항공 항공권 예매 / 나의 여행 / 체크인 / 출도착 탭바 (위젯 카드 위에 이음새 연결) */}
          <div className="relative z-10 -mb-px w-60 rounded-tl-2xl rounded-tr-xl bg-white shadow-[0_-4px_18px_rgba(7,29,73,0.05)]">
            <button
              onClick={() => setTab("upload")}
              className={classNames(
                "relative z-10 flex w-full items-center justify-center gap-2 rounded-tl-2xl rounded-tr-xl px-5 py-4 text-xl font-black",
                tab === "upload"
                  ? "bg-white text-[#071d49] dark:bg-gray-900 dark:text-white"
                  : "text-[#425570] hover:bg-white/80 dark:bg-gray-800/50 dark:text-gray-300"
              )}
            >
              <span aria-hidden="true">✈</span> 합격자 등록
            </button>
          </div>

          <div className="rounded-b-xl rounded-tr-xl bg-white p-5 shadow-[0_12px_38px_rgba(7,29,73,0.08)] dark:bg-gray-900 md:p-7">
            {/* 서브 옵션 바 (예매/마일리지 예매, 왕복/편도, 가까운 날짜 함께 조회 라인) */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-gray-800">
              {/* 좌측 지점 선택 & 체크박스 */}
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

              {/* 우측 일반 / 일괄 등록 선택 */}
              <div className="flex rounded-full bg-[#f3f6f9] p-1 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setRegistrationMode("single")}
                  disabled={submitting}
                  className={classNames(
                    "rounded-full px-4 py-1.5 text-[11px] font-bold",
                    registrationMode === "single"
                      ? "bg-[#071d49] text-white"
                      : "text-slate-500 hover:text-[#071d49] dark:text-gray-400"
                  )}
                >
                  일반 등록
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationMode("bulk")}
                  disabled={submitting}
                  className={classNames(
                    "rounded-full px-4 py-1.5 text-[11px] font-bold",
                    registrationMode === "bulk"
                      ? "bg-[#071d49] text-white"
                      : "text-slate-500 hover:text-[#071d49] dark:text-gray-400"
                  )}
                >
                  일괄 등록
                </button>
              </div>
            </div>

            {/* 5. 대한항공 시그니처 1줄 수평 수집 폼 행 (PUS ⇄ To Departure / Date / Passenger / Class / Search CTA) */}
            {registrationMode === "single" && (
              <div className="rounded-lg border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900/80">
                <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-gray-800 lg:grid-cols-[repeat(18,minmax(0,1fr))] lg:divide-x lg:divide-y-0">
                  {/* Column 1: PUS ⇄ To (학생 성명 / 대학) (4열) */}
                  <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-gray-800 lg:col-span-6">
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

                  {/* Column 2: 학과 (2열) */}
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

                  {/* Column 3: 수시 / 정시 전형 선택 (2열) */}
                  <div className="flex min-h-[72px] flex-col justify-center px-3 py-2 lg:col-span-2">
                    <div className="text-[10px] font-bold tracking-wide text-slate-500">
                      전형 유형 <span className="text-[#3f9fdb]">*</span>
                    </div>
                    <div className="mt-1 flex w-fit rounded-full bg-[#f3f6f9] p-0.5 dark:bg-gray-800">
                      <button
                        type="button"
                        onClick={() => setTrack("수시")}
                        className={classNames(
                          "whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold",
                          track === "수시"
                            ? "bg-[#e5f5fc] text-[#1676ad]"
                            : "text-slate-500 hover:bg-slate-100 dark:text-gray-400"
                        )}
                      >
                        수시
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrack("정시")}
                        className={classNames(
                          "whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold",
                          track === "정시"
                            ? "bg-[#e5f5fc] text-[#1676ad]"
                            : "text-slate-500 hover:bg-slate-100 dark:text-gray-400"
                        )}
                      >
                        정시
                      </button>
                    </div>
                  </div>

                  {/* Column 4: 합격증 첨부 (2열) */}
                  <div className="lg:col-span-4">
                    <FileDrop file={file} setFile={setFile} error={fileError} />
                  </div>

                  {/* Column 5: 대한항공 시그니처 Sky Blue 알약 검색 버튼 (2열) */}
                  <div className="flex items-center justify-center p-3 lg:col-span-3">
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

            {registrationMode === "bulk" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400">
                    학생별 정보를 입력하고 각 행에 해당 합격증을 첨부해 주세요.
                  </p>
                  <span className="rounded-full bg-[#eaf7fd] px-3 py-1 text-[10px] font-bold text-[#1676ad]">
                    총 {batchEntries.length}명
                  </span>
                </div>

                {batchEntries.map((entry, index) => {
                  const entryDepartments = entry.univ
                    ? Object.keys(universities[entry.univ]?.depts ?? {})
                    : [];

                  return (
                    <div
                      key={entry.id}
                      className={classNames(
                        "overflow-visible rounded-xl border bg-white dark:bg-gray-900/80",
                        entry.status === "error"
                          ? "border-rose-300"
                          : entry.status === "uploading"
                            ? "border-[#3f9fdb]"
                            : "border-slate-200 dark:border-gray-800"
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#071d49] text-[10px] font-bold text-white">
                            {index + 1}
                          </span>
                          <span className="text-[11px] font-bold text-[#071d49] dark:text-sky-300">
                            학생 {index + 1}
                          </span>
                          {entry.status === "uploading" && (
                            <span className="text-[10px] font-bold text-[#3f9fdb]">등록 중...</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBatchEntry(entry.id)}
                          disabled={submitting}
                          className="rounded-full px-3 py-1 text-[10px] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </div>

                      <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-gray-800 lg:grid-cols-[repeat(18,minmax(0,1fr))] lg:divide-x lg:divide-y-0">
                        <div className="flex min-h-[72px] flex-col justify-center px-4 py-2 lg:col-span-3">
                          <div className="text-[10px] font-bold tracking-wide text-slate-500">
                            학생 성명 <span className="text-[#3f9fdb]">*</span>
                          </div>
                          <input
                            value={entry.name}
                            onChange={(e) => updateBatchEntry(entry.id, { name: e.target.value })}
                            disabled={submitting}
                            placeholder="홍길동"
                            className="w-full bg-transparent text-base font-bold leading-6 text-[#071d49] placeholder:font-normal placeholder:text-slate-300 focus:outline-none disabled:opacity-60 dark:text-gray-100"
                          />
                        </div>

                        <div className="lg:col-span-4">
                          <Combobox
                            label="합격 대학"
                            value={entry.univ}
                            setValue={(value) => updateBatchEntry(entry.id, { univ: value, dept: "" })}
                            suggestions={univSuggestions}
                            placeholder="서울대학교"
                            required
                            restrictToList
                            subLabel={entry.univ ? `코드 ${universities[entry.univ]?.code ?? ""}` : undefined}
                          />
                        </div>

                        <div className="lg:col-span-3">
                          <Combobox
                            label="학과"
                            value={entry.dept}
                            setValue={(value) => updateBatchEntry(entry.id, { dept: value })}
                            suggestions={entryDepartments}
                            placeholder="의예과"
                            required
                            subLabel={
                              entry.dept && entry.univ
                                ? `코드 ${(universities[entry.univ]?.depts ?? {})[entry.dept] ?? "000"}`
                                : undefined
                            }
                          />
                        </div>

                        <div className="flex min-h-[72px] flex-col justify-center px-3 py-2 lg:col-span-2">
                          <div className="text-[10px] font-bold tracking-wide text-slate-500">
                            전형 유형 <span className="text-[#3f9fdb]">*</span>
                          </div>
                          <div className="mt-1 flex w-fit rounded-full bg-[#f3f6f9] p-0.5 dark:bg-gray-800">
                            {(["수시", "정시"] as const).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => updateBatchEntry(entry.id, { track: option })}
                                disabled={submitting}
                                className={classNames(
                                  "whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold",
                                  entry.track === option
                                    ? "bg-[#e5f5fc] text-[#1676ad]"
                                    : "text-slate-500 hover:bg-slate-100 dark:text-gray-400"
                                )}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="lg:col-span-6">
                          <FileDrop
                            file={entry.file}
                            setFile={(nextFile) => updateBatchEntry(entry.id, { file: nextFile })}
                            error={false}
                          />
                        </div>
                      </div>

                      {entry.error && (
                        <div className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[10px] font-bold text-rose-600">
                          {entry.error}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex flex-col-reverse justify-between gap-3 pt-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={addBatchEntry}
                    disabled={submitting || batchEntries.length >= 20}
                    className="rounded-full border border-dashed border-[#3f9fdb] bg-white px-5 py-2.5 text-[11px] font-bold text-[#1676ad] hover:bg-[#eaf7fd] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    + 학생 추가
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchSubmit}
                    disabled={submitting}
                    className="rounded-full bg-[#4da8dd] px-8 py-3 text-xs font-bold text-white shadow-[0_4px_12px_rgba(63,159,219,0.24)] hover:bg-[#2789c3] disabled:opacity-50"
                  >
                    {submitting ? "일괄 등록 중..." : `총 ${batchEntries.length}명 일괄 등록`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="w-full px-5 py-10 md:px-10 md:py-14 xl:px-[100px]">
        <ScholarshipSection rows={rows} />
      </section>

      <section className="w-full bg-[#dff2fb] px-5 py-8 dark:bg-slate-900 md:px-10 xl:px-[100px]">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <article className="flex min-h-28 flex-col items-center justify-center rounded-md bg-white/70 p-4 text-center dark:bg-gray-900">
              <span className="text-xs font-bold text-[#315d81] dark:text-sky-300">총 제출 건</span>
              <strong className="mt-3 text-3xl font-black text-[#071d49] dark:text-white">
                {submissionTotal}
              </strong>
            </article>

            <article className="flex min-h-28 flex-col items-center justify-center rounded-md bg-white/70 p-4 text-center dark:bg-gray-900">
              <span className="text-xs font-bold text-[#315d81] dark:text-sky-300">최다 합격 대학</span>
              <div className="mt-3 flex h-12 w-full max-w-60 items-center justify-center px-2">
                {topUniversityCi && topUniversity ? (
                  <Image
                    src={topUniversityCi}
                    alt={`${topUniversity.name} CI`}
                    width={64}
                    height={48}
                    unoptimized={topUniversityCi.endsWith(".gif")}
                    className="h-full w-16 object-contain"
                  />
                ) : (
                  <span className="break-keep text-sm font-black leading-tight text-[#315d81] sm:text-base">
                    {topUniversity?.name || "UNI"}
                  </span>
                )}
              </div>
            </article>

            <article
              tabIndex={stats.universities.length > 0 ? 0 : undefined}
              aria-describedby={stats.universities.length > 0 ? "university-diversity-tooltip" : undefined}
              onMouseEnter={(event) => {
                if (stats.universities.length > 0) showUniversityTooltip(event.currentTarget);
              }}
              onMouseLeave={() => setUniversityTooltip(null)}
              onFocus={(event) => {
                if (stats.universities.length > 0) showUniversityTooltip(event.currentTarget);
              }}
              onBlur={() => setUniversityTooltip(null)}
              className="flex min-h-28 flex-col items-center justify-center rounded-md bg-white/70 p-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#4da8dd] focus-visible:ring-offset-2 dark:bg-gray-900"
            >
              <span className="text-xs font-bold text-[#315d81] dark:text-sky-300">합격 대학 다양성</span>
              <strong className="mt-3 text-3xl font-black text-[#071d49] dark:text-white">
                {stats.universityCount}
              </strong>
            </article>
          </div>
      </section>

      <section
        id="status-section"
        className="w-full scroll-mt-20 px-5 py-10 md:px-10 xl:px-[100px]"
      >
        <div className="bg-white dark:bg-gray-900">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-gray-800">
            <div>
              <h3 className="text-xl font-black text-[#071d49] dark:text-white">합격 현황</h3>
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
                  {showManageColumn && <th className="px-3 py-2 text-right">관리 조치</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={showManageColumn ? 10 : 9} className="border-b border-slate-100 py-12 text-center text-xs font-medium text-slate-400">
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
                      {showManageColumn && (
                        <td className="rounded-r-2xl px-3 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {isAdmin && (
                              <>
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
                              </>
                            )}
                            {(isAdmin || r.status === "대기중") && (
                              <>
                                <button
                                  onClick={() => setEditRow(r)}
                                  className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-bold text-[#b45309] hover:bg-[#f59e0b] hover:text-white transition-colors"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => deleteRow(r)}
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-700 hover:text-white"
                                >
                                  삭제
                                </button>
                              </>
                            )}
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
        <section className="w-full px-5 py-6 md:px-10 xl:px-[100px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-gray-900">
            <UniversityManager
              universities={universities}
              onUpsertUniversity={upsertUniversity}
              onUpsertDept={upsertDept}
            />
          </div>
        </section>
      )}

      {/* 10. 플로팅 대한항공 AI 챗봇 오마주 버튼 (+ 이용 가이드) */}
      <a
        href={HOWTO_URL}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-7 right-7 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#3346ad] to-[#147dc2] px-4 py-3 text-[10px] font-bold text-white shadow-xl hover:-translate-y-0.5"
      >
        <span className="text-sm">✦</span> AI 도움말
      </a>

      {/* 11. 이투스247 브랜드 푸터 */}
      <footer className="bg-[#dff2fb] px-5 py-10 text-[#315d81] md:px-10 md:py-12 xl:px-[100px]">
        <div className="flex w-full flex-col gap-9 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <a
              href="https://247.etoos.com/index.do"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center"
              aria-label="이투스247학원 홈페이지"
            >
              <Image
                src="/etoos247-bi.png"
                alt="이투스247학원"
                width={330}
                height={111}
                className="h-auto w-[112px] object-contain"
              />
            </a>
            <p className="mt-5 text-[11px] font-semibold text-[#52728e]">
              이투스에씨아이 주식회사 | 서울특별시 서초구 남부순환로 2547, 3층(서초동 1354-3)
            </p>
            <p className="mt-2 text-[10px] font-medium text-[#7b9aaf]">
              Copyright © ETOOS ECI Co.,Ltd. All rights Reserved.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <nav
              aria-label="푸터 주요 링크"
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-black text-[#315d81]"
            >
              <a
                href="https://247.etoos.com/member/privacy.do?tab=privacy"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0077c8]"
              >
                개인정보처리방침
              </a>
              <a
                href="https://247.etoos.com/member/privacy.do?tab=terms"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0077c8]"
              >
                이용약관
              </a>
              <a
                href="https://247.etoos.com/franchise/inquiry.do"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0077c8]"
              >
                가맹문의
              </a>
              <a
                href="https://247.etoos.com/cont/history.do"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0077c8]"
              >
                브랜드 소개
              </a>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://www.youtube.com/@etoos247"
                target="_blank"
                rel="noreferrer"
                aria-label="이투스247 유튜브"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#9fc7dc] bg-white/55 text-[#315d81] hover:border-[#0077c8] hover:bg-white hover:text-[#0077c8]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.6 4.6 12 4.6 12 4.6s-5.6 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.9.5 7.5.5 7.5.5s5.6 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.3V8.7l5.7 3.3-5.7 3.3Z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/etoos247_official/"
                target="_blank"
                rel="noreferrer"
                aria-label="이투스247 인스타그램"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#9fc7dc] bg-white/55 text-[#315d81] hover:border-[#0077c8] hover:bg-white hover:text-[#0077c8]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" />
                </svg>
              </a>
              <a
                href="https://blog.naver.com/etooseci247"
                target="_blank"
                rel="noreferrer"
                aria-label="이투스247 네이버 블로그"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#9fc7dc] bg-white/55 text-sm font-black text-[#315d81] hover:border-[#0077c8] hover:bg-white hover:text-[#0077c8]"
              >
                N
              </a>
              <a
                href="https://247.etoos.com/index.do"
                target="_blank"
                rel="noreferrer"
                aria-label="이투스247 홈페이지"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#9fc7dc] bg-white/55 text-[#315d81] hover:border-[#0077c8] hover:bg-white hover:text-[#0077c8]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
                </svg>
              </a>

              <select
                aria-label="패밀리 사이트"
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  window.open(event.target.value, "_blank", "noopener,noreferrer");
                  event.currentTarget.value = "";
                }}
                className="h-9 min-w-[150px] rounded-md border border-[#9fc7dc] bg-white/55 px-4 text-[11px] font-bold text-[#315d81] outline-none hover:bg-white focus:border-[#0077c8]"
              >
                <option value="">패밀리 사이트</option>
                <option value="https://247.etoos.com/index.do">이투스247학원</option>
                <option value="https://intelligent-salk.vercel.app/">247기사송출</option>
                <option value="https://etoos247-experience-info.vercel.app/">247체험단</option>
              </select>

              <button
                type="button"
                onClick={goToTop}
                className="flex h-9 items-center gap-1 rounded-md border border-[#9fc7dc] bg-white/55 px-4 text-[11px] font-black text-[#315d81] hover:border-[#0077c8] hover:bg-white hover:text-[#0077c8]"
                aria-label="화면 최상단으로 이동"
              >
                <span aria-hidden="true">↑</span> TOP
              </button>
            </div>
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
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("admit_token") || ""}`,
              },
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

      {universityTooltip && typeof document !== "undefined" && createPortal(
        <div
          id="university-diversity-tooltip"
          role="tooltip"
          className="pointer-events-none fixed z-[110] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl bg-[#071d49] p-4 text-left text-white shadow-[0_20px_50px_rgba(7,29,73,0.32)]"
          style={{
            top: universityTooltip.top,
            left: universityTooltip.left,
            width: universityTooltip.width,
          }}
        >
          <span className="block text-[10px] font-black tracking-[0.12em] text-[#89d1f2]">
            ADMITTED UNIVERSITIES
          </span>
          <strong className="mt-1 block text-sm">합격 대학 {stats.universityCount}곳</strong>
          <span
            className="mt-3 grid gap-x-4 gap-y-2"
            style={{ gridTemplateColumns: `repeat(${universityTooltip.columns}, minmax(0, 1fr))` }}
          >
            {stats.universities.map((university) => (
              <span
                key={university}
                className="truncate border-t border-white/10 pt-2 text-[11px] font-bold text-white/85"
              >
                {university}
              </span>
            ))}
          </span>
        </div>,
        document.body,
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
