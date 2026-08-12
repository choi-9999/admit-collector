'use client';

import { useEffect } from "react";

export function ContactModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-[#07111f]/65 p-5 backdrop-blur-[4px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="w-full max-w-[360px] overflow-hidden rounded-[22px] border border-white/15 bg-[#202020] px-6 pb-5 pt-8 text-white shadow-[0_28px_80px_rgba(0,0,0,0.48)]"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#2f8be6]/15 text-[#2f8be6]">
            <svg viewBox="0 0 64 64" aria-hidden="true" className="h-12 w-12" fill="none">
              <path
                d="M18 49h27c7.2 0 13-5.5 13-12.3 0-6.1-4.7-11.2-10.9-12.1C44.7 16.7 38.5 12 31 12c-8.3 0-15.1 5.8-16.6 13.5C8.4 27.1 4 32.4 4 38.7 4 44.4 8.7 49 14.6 49H18Z"
                fill="currentColor"
              />
              <path d="M26 28.5c.4-4 3.2-6.5 7.2-6.5 4.1 0 7 2.4 7 6 0 3-1.6 4.5-4.5 6.3-2.2 1.4-2.9 2.4-2.9 4.4" stroke="#202020" strokeWidth="5" strokeLinecap="round" />
              <circle cx="32.8" cy="45" r="2.8" fill="#202020" />
            </svg>
          </div>

          <h2 id="contact-modal-title" className="sr-only">문의하기</h2>
          <div className="space-y-2 text-[15px] font-extrabold leading-5 text-[#f3f4f6]">
            <p className="flex items-center justify-center gap-2">
              <span aria-hidden="true">👤</span>
              <span>가맹마케팅지원팀 / 최선규 대리</span>
            </p>
            <a href="mailto:sgchoi@etoos.com" className="flex items-center justify-center gap-2 transition hover:text-[#55a7f5]">
              <span aria-hidden="true">✉️</span>
              <span>sgchoi@etoos.com</span>
            </a>
            <a href="tel:070-7464-9770" className="flex items-center justify-center gap-2 transition hover:text-[#55a7f5]">
              <span aria-hidden="true">☎️</span>
              <span>070-7464-9770</span>
            </a>
          </div>
        </div>

        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-7 w-full rounded-lg bg-[#2f8be6] py-3 text-[14px] font-black text-white transition hover:bg-[#247bd0] focus:outline-none focus:ring-4 focus:ring-[#2f8be6]/30"
        >
          계속
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2.5 w-full py-2 text-[13px] font-semibold text-white/35 transition hover:text-white/70"
        >
          취소
        </button>
      </section>
    </div>
  );
}
