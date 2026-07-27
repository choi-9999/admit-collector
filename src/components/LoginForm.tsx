import React, { useState } from "react";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function LoginForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (pw === "admin123") {
          setError("");
          onSuccess();
        } else {
          setError("비밀번호가 올바르지 않습니다.");
        }
      }}
      className="grid gap-4"
    >
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
          관리자 암호 입력
        </label>
        <input
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className={classNames(
            "w-full rounded-2xl border bg-white p-3.5 text-sm font-semibold focus:outline-none focus:ring-4 dark:bg-gray-900 dark:text-gray-100",
            error
              ? "border-rose-400 focus:ring-rose-500/20"
              : "border-slate-200 focus:border-sky-500 focus:ring-sky-500/15 dark:border-gray-700"
          )}
        />
        {error && <p className="mt-1.5 text-xs font-semibold text-rose-500">{error}</p>}
      </div>

      <div className="flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          취소
        </button>
        <button
          type="submit"
          className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-sky-700 dark:bg-sky-500"
        >
          로그인
        </button>
      </div>
    </form>
  );
}
