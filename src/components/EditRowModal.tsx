import React, { useMemo, useState } from "react";
import { AdmitRow, UniversitiesMap } from "@/types/admit";
import { Combobox } from "./Combobox";
import { appAlert } from "@/lib/appDialog";

export function EditRowModal({
  row,
  universities,
  branches,
  onClose,
  onSave,
}: {
  row: AdmitRow;
  universities: UniversitiesMap;
  branches: string[];
  onClose: () => void;
  onSave: (patch: Pick<AdmitRow, "name" | "university" | "dept" | "track" | "branch" | "universityCode" | "deptCode">) => void;
}) {
  const [name, setName] = useState(row.name);
  const [univ, setUniv] = useState(row.university);
  const [dept, setDept] = useState(row.dept);
  const [track, setTrack] = useState<"수시" | "정시">(row.track);
  const [branch, setBranch] = useState(row.branch);

  const univSuggestions = useMemo(() => Object.keys(universities), [universities]);
  const deptSuggestions = useMemo(() => {
    const u = universities[univ];
    return u ? Object.keys(u.depts) : [];
  }, [universities, univ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 ring-1 ring-slate-200 dark:ring-gray-800">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-gray-800">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-gray-100">
            ✏️ 합격 내역 항목 수정
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              이름
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <Combobox
            label="합격 대학"
            value={univ}
            setValue={setUniv}
            suggestions={univSuggestions}
            placeholder="예: 서울대학교"
            required
            restrictToList
          />

          <Combobox
            label="학과"
            value={dept}
            setValue={setDept}
            suggestions={deptSuggestions}
            placeholder="예: 경영학과"
            required
          />

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              전형
            </label>
            <div className="flex gap-3">
              {(["수시", "정시"] as const).map((t) => (
                <label key={t} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                  <input
                    type="radio"
                    name="edit-track"
                    value={t}
                    checked={track === t}
                    onChange={() => setTrack(t)}
                    className="accent-sky-600"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              지점
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (!name.trim() || !univ.trim() || !dept.trim()) {
                void appAlert("이름, 대학, 학과를 모두 입력해 주세요.");
                return;
              }
              if (!universities[univ]) {
                void appAlert("합격 대학은 목록에서만 선택할 수 있습니다.");
                return;
              }
              const uniCode = universities[univ]?.code ?? "";
              const depCode = universities[univ]?.depts?.[dept] ?? "000";
              onSave({
                name: name.trim(),
                university: univ.trim(),
                dept: dept.trim(),
                track,
                branch,
                universityCode: uniCode,
                deptCode: depCode,
              });
            }}
            className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-sky-700 dark:bg-sky-500"
          >
            변경사항 저장
          </button>
        </div>
      </div>
    </div>
  );
}
