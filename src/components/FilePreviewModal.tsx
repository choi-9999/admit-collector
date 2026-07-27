import React from "react";
import { AdmitRow } from "@/types/admit";

export function FilePreviewModal({
  row,
  onClose,
}: {
  row: AdmitRow;
  onClose: () => void;
}) {
  const isPdf = row.fileUrl?.toLowerCase().includes(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              📄
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-gray-100">
                {row.name} 학생 합격증 증빙서류
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {row.university} {row.dept} ({row.track}) · {row.branch} 지점
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {row.fileUrl && (
              <a
                href={row.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 shadow-sm hover:bg-sky-50 dark:border-gray-700 dark:bg-gray-800 dark:text-sky-300"
              >
                새 탭에서 열기 ↗
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-slate-900/5 p-4 flex items-center justify-center dark:bg-black/20">
          {row.fileUrl ? (
            isPdf ? (
              <iframe
                src={row.fileUrl}
                className="h-full w-full rounded-2xl border border-slate-200 dark:border-gray-800"
                title="합격증 PDF 미리보기"
              />
            ) : (
              <img
                src={row.fileUrl}
                alt="합격증 증빙서류"
                className="max-h-full max-w-full rounded-2xl object-contain shadow-md"
              />
            )
          ) : (
            <div className="text-center text-xs font-semibold text-slate-400">
              미리보기 가능한 파일 URL이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
