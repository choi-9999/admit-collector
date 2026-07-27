import React, { useMemo, useState } from "react";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function BranchSelector({
  current,
  setCurrent,
  branches,
}: {
  current: string | null;
  setCurrent: (b: string | null) => void;
  branches: string[];
}) {
  const [openList, setOpenList] = useState(false);
  const [input, setInput] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(-1);

  const matchList = useMemo(
    () => branches.filter((b) => b.toLowerCase().includes(input.trim().toLowerCase())),
    [branches, input]
  );

  const exact = branches.includes(input.trim());

  const applySelection = (value?: string) => {
    const v = value ?? (exact ? input.trim() : matchList[0]);
    if (v) {
      setCurrent(v);
      setInput(v);
      setShowSuggest(false);
      setHoverIndex(-1);
    } else {
      alert("목록에 포함된 정확한 지점명을 선택해 주세요.");
    }
  };

  return (
    <div className="relative mb-6 rounded-3xl bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-indigo-500/10 p-4 ring-1 ring-sky-200/60 backdrop-blur-md dark:from-sky-950/40 dark:to-indigo-950/40 dark:ring-sky-800/50">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>

          <div className="relative flex-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300">
              지점 선택 (현재 수집 지점)
            </label>
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggest(true);
                setHoverIndex(-1);
              }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggest(false), 150);
                setHoverIndex(-1);
              }}
              onKeyDown={(e) => {
                if (!showSuggest && ["ArrowDown", "ArrowUp"].includes(e.key)) setShowSuggest(true);
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = Math.min(hoverIndex + 1, Math.max(matchList.length - 1, 0));
                  setHoverIndex(next);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = Math.max(hoverIndex - 1, 0);
                  setHoverIndex(prev);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (showSuggest && hoverIndex >= 0 && matchList[hoverIndex]) applySelection(matchList[hoverIndex]);
                  else applySelection();
                } else if (e.key === "Escape") {
                  setShowSuggest(false);
                  setHoverIndex(-1);
                }
              }}
              placeholder="지점명을 검색하세요 (예: 강남, 마포, 분당)"
              className="mt-0.5 w-full rounded-2xl border border-sky-200 bg-white/90 p-2.5 pr-20 text-sm font-bold text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/15 dark:border-sky-800 dark:bg-gray-900/90 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() => applySelection()}
              className="absolute right-1.5 top-6 rounded-xl bg-sky-600 px-3 py-1 text-xs font-bold text-white shadow hover:bg-sky-700"
            >
              선택
            </button>

            {showSuggest && input && (
              <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-2xl border border-sky-100 bg-white p-1.5 shadow-2xl backdrop-blur-lg dark:border-sky-900 dark:bg-gray-900">
                {matchList.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">일치하는 지점이 없습니다</div>
                ) : (
                  matchList.map((b, idx) => (
                    <button
                      key={b}
                      type="button"
                      onMouseEnter={() => setHoverIndex(idx)}
                      onMouseLeave={() => setHoverIndex(-1)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applySelection(b);
                      }}
                      className={classNames(
                        "block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors",
                        idx === hoverIndex ? "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200" : "hover:bg-sky-50 dark:hover:bg-sky-900/30"
                      )}
                    >
                      {b}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-sky-100 pt-2.5 dark:border-sky-900/50 md:border-0 md:pt-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-900 dark:text-sky-300">현재 지점:</span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-sky-700 shadow-sm ring-1 ring-sky-200 dark:bg-gray-900 dark:text-sky-300 dark:ring-sky-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {current ?? "미선택"}
            </span>
          </div>

          <button
            onClick={() => setOpenList((o) => !o)}
            className="rounded-xl bg-white/80 px-3 py-1.5 text-xs font-bold text-sky-700 shadow-sm ring-1 ring-sky-200 transition-colors hover:bg-sky-50 dark:bg-gray-900 dark:text-sky-300 dark:ring-sky-800 dark:hover:bg-gray-800"
          >
            {openList ? "접기 ▲" : "전체 지점 62개 펼치기 ▼"}
          </button>
        </div>
      </div>

      {openList && (
        <div className="mt-4 grid grid-cols-2 gap-2 max-h-64 overflow-auto rounded-2xl bg-white/70 p-3 ring-1 ring-sky-100 dark:bg-gray-900/70 dark:ring-sky-900/60 md:grid-cols-4 lg:grid-cols-6">
          {branches.map((b) => (
            <button
              key={b}
              onClick={() => {
                setCurrent(b);
                setInput(b);
                setShowSuggest(false);
                setHoverIndex(-1);
              }}
              className={classNames(
                "rounded-xl px-3 py-2 text-left text-xs font-bold transition-all ring-1",
                current === b
                  ? "bg-sky-600 text-white ring-sky-600 shadow-md"
                  : "bg-white text-slate-700 ring-slate-200/80 hover:bg-sky-50 hover:text-sky-700 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
              )}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
