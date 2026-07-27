import React from "react";
import { AdmitStatus } from "@/types/admit";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function StatusBadge({ s, reason }: { s: AdmitStatus; reason?: string }) {
  const styles: Record<AdmitStatus, string> = {
    "대기중": "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
    "승인": "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
    "반려": "bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800",
  };

  const dots: Record<AdmitStatus, string> = {
    "대기중": "bg-amber-500",
    "승인": "bg-emerald-500",
    "반려": "bg-rose-500",
  };

  return (
    <span className={classNames("group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition-all", styles[s])}>
      <span className={classNames("h-1.5 w-1.5 rounded-full", dots[s])} />
      {s}
      {s === "반려" && !!reason && (
        <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-max max-w-xs -translate-x-1/2 whitespace-pre-wrap rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-normal leading-snug text-white opacity-0 shadow-xl ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-800">
          <span className="font-semibold text-rose-300">반려 사유:</span> {reason}
        </span>
      )}
    </span>
  );
}
