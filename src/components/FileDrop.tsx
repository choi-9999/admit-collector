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
    const MAX_SIZE = 10 * 1024 * 1024;

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
    <div className="relative flex flex-col justify-center px-4 py-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold tracking-wide text-slate-500">
          합격증 첨부 <span className="text-[#3f9fdb]">*</span>
        </label>
      </div>

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
        onClick={() => inputRef.current?.click()}
        className={classNames(
          "mt-0.5 flex cursor-pointer items-center justify-between gap-2 rounded-xl p-1.5 transition-all",
          dragOver ? "bg-[#e8f3fa]" : "hover:bg-[#f4f9fd]"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-base">📂</span>
          {file ? (
            <span className="truncate text-[11px] font-semibold text-[#071d49] dark:text-sky-300">
              {file.name}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400">
              파일을 선택하세요 (PDF/이미지)
            </span>
          )}
        </div>

        <button
          type="button"
          className="shrink-0 rounded-full bg-[#071d49] px-3 py-1 text-[10px] font-bold text-white hover:bg-[#153d79]"
        >
          {file ? "변경" : "첨부"}
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

      {error && (
        <p className="absolute -bottom-4 left-4 text-[10px] font-bold text-rose-500">
          * 증빙 파일 필수
        </p>
      )}
    </div>
  );
}
