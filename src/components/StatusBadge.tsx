import React from "react";
import { AdmitStatus } from "@/types/admit";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function StatusBadge({ s, reason }: { s: AdmitStatus; reason?: string }) {
  const styles: Record<AdmitStatus, string> = {
    "대기중": "bg-[#fff8e6] text-[#b45309] border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    "승인": "bg-[#e6f7ed] text-[#047857] border-[#a7f3d0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    "반려": "bg-[#ffeef0] text-[#be123c] border-[#fecdd3] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  };

  const dots: Record<AdmitStatus, string> = {
    "대기중": "bg-[#f59e0b]",
    "승인": "bg-[#10b981]",
    "반려": "bg-[#f43f5e]",
  };

  return (
    <span className={classNames("group relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all shadow-sm", styles[s])}>
      <span className={classNames("h-2 w-2 rounded-full", dots[s])} />
      {s}
      {s === "반려" && !!reason && (
        <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-max max-w-xs whitespace-pre-wrap rounded-2xl bg-[#00256c] px-3.5 py-2.5 text-[11px] font-normal leading-relaxed text-white opacity-0 shadow-2xl transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-800">
          <span className="font-bold text-[#93c5fd]">반려 사유:</span> {reason}
        </span>
      )}
    </span>
  );
}
