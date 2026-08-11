import React, { useMemo, useState } from "react";
import { UniversitiesMap } from "@/types/admit";
import { appAlert } from "@/lib/appDialog";

export function UniversityManager({
  universities,
  onUpsertUniversity,
  onUpsertDept,
}: {
  universities: UniversitiesMap;
  onUpsertUniversity: (uName: string, code: string) => void;
  onUpsertDept: (uName: string, dName: string, dCode: string) => void;
}) {
  const [uName, setUName] = useState("");
  const [uCode, setUCode] = useState("");
  const [dName, setDName] = useState("");
  const [dCode, setDCode] = useState("000");
  const [selectedU, setSelectedU] = useState<string>("");

  const uList = Object.keys(universities).sort((a, b) => a.localeCompare(b));
  const dList = useMemo(
    () => Object.keys(universities[selectedU]?.depts || {}).sort((a, b) => a.localeCompare(b)),
    [universities, selectedU]
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 대학 추가/수정 */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">
          🏛️ 대학 추가 / 학교코드 수정
        </h4>
        <div className="grid gap-2">
          <input
            value={uName}
            onChange={(e) => setUName(e.target.value)}
            placeholder="대학명 (예: 서울대학교)"
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            value={uCode}
            onChange={(e) => setUCode(e.target.value)}
            placeholder="학교코드 (예: A, B, 100)"
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => {
              if (!uName.trim()) return void appAlert("대학명을 입력하세요");
              onUpsertUniversity(uName.trim(), uCode.trim());
              setUName("");
              setUCode("");
            }}
            className="rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow hover:bg-black dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            대학 저장
          </button>
        </div>

        <div className="mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200/80 bg-white/70 dark:border-gray-800 dark:bg-gray-900/50">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-800">
              <tr className="text-slate-500">
                <th className="px-3 py-2 font-bold">대학명</th>
                <th className="px-3 py-2 font-bold">학교코드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {uList.map((u) => (
                <tr key={u} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2 font-bold text-slate-800 dark:text-gray-200">{u}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-500 dark:text-gray-400">{universities[u].code || "(없음)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 학과 추가/수정 */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">
          📚 학과 추가 / 학과코드 수정
        </h4>
        <div className="grid gap-2">
          <select
            value={selectedU}
            onChange={(e) => setSelectedU(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">대학 선택</option>
            {uList.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <input
            value={dName}
            onChange={(e) => setDName(e.target.value)}
            placeholder="학과명 (예: 경영학과)"
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            value={dCode}
            onChange={(e) => setDCode(e.target.value)}
            placeholder="학과코드 (기본 000)"
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => {
              if (!selectedU) return void appAlert("대학을 먼저 선택하세요");
              if (!dName.trim()) return void appAlert("학과명을 입력하세요");
              onUpsertDept(selectedU, dName.trim(), dCode.trim() || "000");
              setDName("");
              setDCode("000");
            }}
            className="rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow hover:bg-black dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            학과 저장
          </button>
        </div>

        <div className="mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200/80 bg-white/70 dark:border-gray-800 dark:bg-gray-900/50">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-800">
              <tr className="text-slate-500">
                <th className="px-3 py-2 font-bold">학과명</th>
                <th className="px-3 py-2 font-bold">학과코드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {selectedU ? (
                dList.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-slate-400">등록된 학과가 없습니다</td>
                  </tr>
                ) : (
                  dList.map((d) => (
                    <tr key={d} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 font-bold text-slate-800 dark:text-gray-200">{d}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-500 dark:text-gray-400">{universities[selectedU].depts[d]}</td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-slate-400">대학을 먼저 선택해 주세요</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
