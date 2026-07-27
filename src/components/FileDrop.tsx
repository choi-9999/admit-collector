import React, { useRef, useState } from "react";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function FileDrop({
  file,
  setFile,
  error,
}: {
  file?: File;
  setFile: (f?: File) => void;
  error?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validate = (f: File) => {
    const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg"];
    const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const hasValidMime = ALLOWED_MIME.includes(f.type);
    const lowerName = f.name.toLowerCase();
    const hasValidExt = ALLOWED_EXT.some((ext) => lowerName.endsWith(ext));

    if (!(hasValidMime || hasValidExt)) {
      alert("PDF, JPG, PNG 확장자 파일만 업로드 가능합니다.");
      return;
    }
    if (f.size > MAX_SIZE) {
      alert("파일 용량은 최대 10MB 이하이어야 합니다.");
      return;
    }

    setFile(f);
  };

  return (
    <div className="w-full">
      <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">
        <span>📎</span> 합격증 증빙 서류 첨부 <span className="text-rose-500">*</span>
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) validate(f);
        }}
        className={classNames(
          "group relative flex min-h-[140px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-200",
          dragOver
            ? "border-sky-500 bg-sky-50/80 shadow-lg dark:bg-sky-950/40"
            : error
            ? "border-rose-400 bg-rose-50/70 dark:bg-rose-950/40"
            : "border-slate-200 bg-white/70 hover:border-sky-400 hover:bg-sky-50/30 dark:border-gray-700 dark:bg-gray-900/70 dark:hover:bg-gray-800/40"
        )}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>

          {file ? (
            <div className="mt-1 flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 dark:bg-sky-900/80 dark:text-sky-200">
                📄 {file.name} ({Math.round(file.size / 1024)} KB)
              </span>
              <button
                type="button"
                onClick={() => setFile(undefined)}
                className="mt-1 text-xs font-semibold text-rose-500 hover:underline"
              >
                삭제하기
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                합격증 이미지/PDF를 이곳에 드래그하거나 선택해 주세요.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-gray-500">
                PDF · JPG · PNG 지원 (최대 10MB)
              </p>
            </>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-black dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {file ? "다른 파일 선택" : "파일 찾기"}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) validate(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-semibold text-rose-500">
          ⚠️ 합격증 파일 첨부는 필수 항목입니다.
        </p>
      )}
    </div>
  );
}
