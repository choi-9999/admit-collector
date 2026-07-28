"use client";

import { useMemo, useState } from "react";
import type { AdmitRow } from "@/types/admit";
import {
  ScholarshipGroup,
  ScholarshipRecipient,
  selectScholarshipRecipients,
} from "@/utils/scholarship";

type ScholarshipSectionProps = {
  rows: AdmitRow[];
};

const GROUP_STYLES: Record<
  ScholarshipGroup,
  { label: string; badge: string; dot: string }
> = {
  메이저: {
    label: "MAJOR",
    badge: "bg-[#071d49] text-white",
    dot: "bg-[#071d49]",
  },
  플래티넘: {
    label: "PLATINUM",
    badge: "bg-[#dce8ef] text-[#315d81]",
    dot: "bg-[#79a6bf]",
  },
  슈프림: {
    label: "SUPREME",
    badge: "bg-[#eaf7fd] text-[#1676ad]",
    dot: "bg-[#4da8dd]",
  },
};

const SCHOOL_BRANDS: Record<string, { mark: string; from: string; to: string }> = {
  서울대학교: { mark: "SNU", from: "#17365d", to: "#315f90" },
  연세대학교: { mark: "YONSEI", from: "#003876", to: "#1765a8" },
  고려대학교: { mark: "KOREA", from: "#8b0029", to: "#b5214e" },
  성균관대학교: { mark: "SKKU", from: "#00573f", to: "#268267" },
  가톨릭대학교: { mark: "CUK", from: "#6d2a78", to: "#9854a2" },
  울산대학교: { mark: "UOU", from: "#005a9c", to: "#318ac3" },
  이화여자대학교: { mark: "EWHA", from: "#00664f", to: "#2c9279" },
  중앙대학교: { mark: "CAU", from: "#005aab", to: "#3189ca" },
  경희대학교: { mark: "KHU", from: "#8b1831", to: "#b7475e" },
  숙명여자대학교: { mark: "SMWU", from: "#264d91", to: "#557cc0" },
  한양대학교: { mark: "HANYANG", from: "#005eb8", to: "#3b92d9" },
  한국과학기술원: { mark: "KAIST", from: "#003b71", to: "#176ca5" },
  KAIST: { mark: "KAIST", from: "#003b71", to: "#176ca5" },
  포항공과대학교: { mark: "POSTECH", from: "#9a1737", to: "#c44e6a" },
  POSTECH: { mark: "POSTECH", from: "#9a1737", to: "#c44e6a" },
};

function getBrand(university: string) {
  return (
    SCHOOL_BRANDS[university] ?? {
      mark: university.replace(/대학교|과학기술원|공과/g, "").slice(0, 6),
      from: "#17365d",
      to: "#4da8dd",
    }
  );
}

function formatAmount(amount: number) {
  return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
}

function ScholarshipCard({ recipient }: { recipient: ScholarshipRecipient }) {
  const brand = getBrand(recipient.row.university);
  const group = GROUP_STYLES[recipient.group];

  return (
    <article
      className="scholarship-card relative h-[210px] w-[310px] shrink-0 overflow-hidden rounded-2xl p-5 text-white shadow-[0_12px_28px_rgba(7,29,73,0.16)]"
      style={{
        background: `linear-gradient(135deg, ${brand.from}, ${brand.to})`,
      }}
    >
      <div className="pointer-events-none absolute -right-3 top-7 rotate-[-8deg] text-[42px] font-black tracking-[-0.08em] text-white/10">
        {brand.mark}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1 text-[9px] font-black tracking-[0.12em] ${group.badge}`}>
            {group.label}
          </span>
          <span className="text-[11px] font-bold text-white/80">{formatAmount(recipient.amount)}</span>
        </div>

        <div className="mt-auto">
          <p className="text-[11px] font-semibold text-white/75">{recipient.row.university}</p>
          <h3 className="mt-1 truncate text-lg font-black tracking-tight">{recipient.row.dept}</h3>
          <div className="mt-3 flex items-end justify-between gap-4 border-t border-white/20 pt-3">
            <div>
              <p className="text-[10px] text-white/65">장학 대상자</p>
              <p className="mt-0.5 text-base font-black">{recipient.row.name}</p>
            </div>
            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm">
              {recipient.row.track}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ScholarshipSection({ rows }: ScholarshipSectionProps) {
  const [listView, setListView] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const recipients = useMemo(() => selectScholarshipRecipients(rows), [rows]);
  const totalAmount = recipients.reduce((sum, item) => sum + item.amount, 0);
  const carouselItems = useMemo(() => {
    if (recipients.length === 0) return [];
    const repeats = Math.max(1, Math.ceil(6 / recipients.length));
    const loop = Array.from({ length: repeats }, () => recipients).flat();
    return [...loop, ...loop];
  }, [recipients]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/75 bg-white/95 shadow-[0_12px_38px_rgba(7,29,73,0.08)] backdrop-blur-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="group relative"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1.5 text-left text-base font-black text-[#071d49]"
              aria-describedby="scholarship-notice"
              aria-expanded={showInfo}
              onClick={() => setShowInfo(true)}
              onFocus={() => setShowInfo(true)}
              onBlur={() => setShowInfo(false)}
            >
              2027 총 1억 장학금 대상자
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#8ba3b8] text-[9px] font-black text-[#52728e]">
                i
              </span>
            </button>
            <div
              id="scholarship-notice"
              role="tooltip"
              className={`
                absolute left-0 top-full z-30 mt-2 w-[min(340px,calc(100vw-72px))] rounded-xl bg-[#071d49] px-4 py-3
                text-[11px] font-medium leading-5 text-white shadow-xl transition
                ${showInfo ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}
              `}
            >
              자동 선정된 장학금 대상자로 최종 확정 상태가 아닙니다. 자세한 내용은 추후 본사 담당자가 안내할 예정입니다.
            </div>
          </div>

          <span className="rounded-full bg-[#eaf7fd] px-3 py-1 text-[10px] font-bold text-[#1676ad]">
            대상자 {recipients.length}명
          </span>
          <span className="text-[10px] font-semibold text-slate-500">
            자동 산정액 {formatAmount(totalAmount)}
          </span>
        </div>

        <label className="flex cursor-pointer items-center gap-2 self-start text-[11px] font-bold text-[#315d81] sm:self-auto">
          일괄 보기
          <input
            type="checkbox"
            checked={listView}
            onChange={(event) => setListView(event.target.checked)}
            className="peer sr-only"
          />
          <span className="relative h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-[#071d49] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4da8dd] peer-focus-visible:ring-offset-2 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>

      {recipients.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-bold text-[#315d81]">현재 자동 선정된 장학금 대상자가 없습니다.</p>
          <p className="mt-1 text-[11px] text-slate-400">합격자가 등록되면 장학 기준에 따라 이곳에 바로 표시됩니다.</p>
        </div>
      ) : listView ? (
        <div className="px-5 py-5 md:px-7">
          {(["메이저", "플래티넘", "슈프림"] as ScholarshipGroup[]).map((groupName) => {
            const groupRecipients = recipients.filter((item) => item.group === groupName);
            if (groupRecipients.length === 0) return null;
            const style = GROUP_STYLES[groupName];

            return (
              <div key={groupName} className="mb-6 last:mb-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <h3 className="text-xs font-black text-[#071d49]">{groupName}</h3>
                  <span className="text-[10px] font-semibold text-slate-400">{groupRecipients.length}명</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <div className="min-w-[720px]">
                    <div className="grid grid-cols-[1.1fr_1.2fr_.8fr_.6fr_.7fr] bg-[#f7fafc] px-4 py-2.5 text-[10px] font-bold text-slate-500">
                      <span>합격 대학</span>
                      <span>학과</span>
                      <span>이름</span>
                      <span>전형</span>
                      <span className="text-right">장학금액</span>
                    </div>
                    {groupRecipients.map((recipient) => (
                      <div
                        key={`${recipient.studentKey}-${recipient.row.id}`}
                        className="grid grid-cols-[1.1fr_1.2fr_.8fr_.6fr_.7fr] border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600"
                      >
                        <span className="font-bold text-[#071d49]">{recipient.row.university}</span>
                        <span>{recipient.row.dept}</span>
                        <span className="font-bold">{recipient.row.name}</span>
                        <span>{recipient.row.track}</span>
                        <span className="text-right font-black text-[#1676ad]">{formatAmount(recipient.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="scholarship-carousel py-6">
          <div className="scholarship-track flex w-max gap-5 px-5">
            {carouselItems.map((recipient, index) => (
              <ScholarshipCard
                key={`${recipient.studentKey}-${recipient.row.id}-${index}`}
                recipient={recipient}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
