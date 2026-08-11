'use client';

import { useCallback, useEffect, useState } from "react";
import { AppDialogRequest, subscribeAppDialog } from "@/lib/appDialog";

const TONE_STYLE = {
  info: { icon: "i", iconClass: "bg-[#e8f3fa] text-[#0077c8]", buttonClass: "bg-[#0077c8] hover:bg-[#0064aa]" },
  warning: { icon: "!", iconClass: "bg-amber-50 text-amber-600", buttonClass: "bg-[#071d49] hover:bg-[#102b61]" },
  danger: { icon: "!", iconClass: "bg-rose-50 text-rose-600", buttonClass: "bg-rose-600 hover:bg-rose-700" },
  success: { icon: "✓", iconClass: "bg-emerald-50 text-emerald-600", buttonClass: "bg-[#0077c8] hover:bg-[#0064aa]" },
} as const;

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<AppDialogRequest | null>(null);

  useEffect(() => subscribeAppDialog(setDialog), []);

  const close = useCallback((result: boolean) => {
    if (!dialog) return;
    dialog.resolve(result);
    setDialog(null);
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, dialog]);

  const tone = dialog?.tone ?? (dialog?.kind === "confirm" ? "warning" : "info");
  const style = TONE_STYLE[tone];
  const title = dialog?.title ?? (dialog?.kind === "confirm" ? "확인이 필요합니다" : "안내");

  return (
    <>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#071d49]/35 p-5 backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`app-dialog-title-${dialog.id}`}
            aria-describedby={`app-dialog-message-${dialog.id}`}
            className="w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(7,29,73,0.24)]"
          >
            <div className="h-1.5 bg-gradient-to-r from-[#0077c8] via-[#58b9df] to-[#8fd7dd]" />
            <div className="px-7 pb-7 pt-6 sm:px-8">
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${style.iconClass}`}>
                  {style.icon}
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2 id={`app-dialog-title-${dialog.id}`} className="text-[18px] font-black tracking-[-0.02em] text-[#071d49]">
                    {title}
                  </h2>
                  <p id={`app-dialog-message-${dialog.id}`} className="mt-2 whitespace-pre-line text-[14px] font-medium leading-6 text-slate-600">
                    {dialog.message}
                  </p>
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-2.5">
                {dialog.kind === "confirm" && (
                  <button
                    type="button"
                    onClick={() => close(false)}
                    className="min-w-24 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-extrabold text-slate-600 transition hover:bg-slate-50"
                  >
                    {dialog.cancelLabel ?? "취소"}
                  </button>
                )}
                <button
                  type="button"
                  autoFocus
                  onClick={() => close(true)}
                  className={`min-w-24 rounded-xl px-5 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition ${style.buttonClass}`}
                >
                  {dialog.confirmLabel ?? "확인"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
