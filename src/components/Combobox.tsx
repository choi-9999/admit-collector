import React, { useMemo, useRef, useState } from "react";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Combobox({
  label,
  value,
  setValue,
  suggestions,
  placeholder,
  required,
  onBlur,
  restrictToList,
  subLabel,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  onBlur?: () => void;
  restrictToList?: boolean;
  subLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = value.trim();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(q.toLowerCase()));
  }, [suggestions, value]);

  return (
    <div className="relative flex flex-col justify-center px-4 py-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
          {label} {required && <span className="text-[#0077c8]">*</span>}
        </label>
        {subLabel && <span className="text-[10px] font-bold text-[#0077c8]">{subLabel}</span>}
      </div>

      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
          if (restrictToList && value.trim() && !suggestions.includes(value.trim())) {
            alert("목록에서 정해진 대학을 선택해 주세요.");
            setValue("");
          }
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHoverIndex((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHoverIndex((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (open && hoverIndex >= 0 && filtered[hoverIndex]) {
              setValue(filtered[hoverIndex]);
              setOpen(false);
            } else {
              setOpen(false);
              setValue(value.trim());
            }
          } else if (e.key === "Escape") {
            setOpen(false);
            setHoverIndex(-1);
          }
        }}
        placeholder={placeholder}
        className="w-full bg-transparent text-lg font-black text-[#00256c] placeholder:text-slate-300 placeholder:font-normal focus:outline-none dark:text-gray-100"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-2xl border border-[#cde2f5] bg-white p-2 shadow-[0_12px_32px_rgba(0,37,108,0.15)] dark:border-gray-700 dark:bg-gray-900">
          {filtered.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              {restrictToList ? "검색 결과 없음 (목록 내 선택만 가능)" : "입력값 그대로 사용 가능"}
            </div>
          ) : (
            filtered.map((s, idx) => (
              <button
                type="button"
                key={s}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(-1)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(s);
                  setOpen(false);
                  inputRef.current?.blur();
                }}
                className={classNames(
                  "block w-full cursor-pointer rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-colors",
                  idx === hoverIndex
                    ? "bg-[#e8f3fa] text-[#00256c] dark:bg-sky-950/70 dark:text-sky-200"
                    : "text-slate-700 hover:bg-[#f4f9fd] dark:text-gray-200 dark:hover:bg-gray-800"
                )}
              >
                {s}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
