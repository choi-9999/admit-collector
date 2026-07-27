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
  icon,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  onBlur?: () => void;
  restrictToList?: boolean;
  icon?: string;
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
    <div className="w-full">
      <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">
        {icon && <span>{icon}</span>}
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
            if (restrictToList && value.trim() && !suggestions.includes(value.trim())) {
              alert("목록에서 정해진 대학/값을 선택해 주세요.");
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
          className="w-full rounded-2xl border border-slate-200 bg-white/90 p-3.5 pr-10 text-sm font-semibold text-slate-900 shadow-sm transition-all focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/15 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-100 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </div>

        {open && (
          <div className="absolute z-40 mt-1.5 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xl backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 dark:text-gray-500">
                {restrictToList ? "검색 결과가 없습니다 (목록 내 선택만 가능)" : "검색 결과 없음. 입력값을 그대로 사용 가능"}
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
                    "block w-full cursor-pointer rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors",
                    idx === hoverIndex
                      ? "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200"
                      : "text-slate-700 hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
                  )}
                >
                  {s}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
