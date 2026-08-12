"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { AdmitRow } from "@/types/admit";
import {
  ScholarshipGroup,
  ScholarshipRecipient,
  selectScholarshipRecipients,
} from "@/utils/scholarship";

type ScholarshipSectionProps = {
  rows: AdmitRow[];
  admissionYear: number;
};

type AdmissionsTooltipState = {
  recipient: ScholarshipRecipient;
  top: number;
  left: number;
};

type NoticeTooltipState = {
  top: number;
  left: number;
  width: number;
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

const SCHOOL_BRANDS: Record<string, { mark: string; from: string; to: string; ci?: string }> = {
  서울대학교: {
    mark: "SNU",
    from: "#1a2d56",
    to: "#5a6885",
    ci: "/seoul-national-university.png",
  },
  연세대학교: {
    mark: "YONSEI",
    from: "#003876",
    to: "#47709c",
    ci: "/yonsei-university.png",
  },
  고려대학교: {
    mark: "KOREA",
    from: "#8b0029",
    to: "#ab4765",
    ci: "/korea-university.png",
  },
  "고려대학교(세종)": {
    mark: "KOREA",
    from: "#8b0029",
    to: "#ab4765",
    ci: "/korea-university.png",
  },
  성균관대학교: {
    mark: "SKKU",
    from: "#093c71",
    to: "#4e7399",
    ci: "/sungkyunkwan-university.png",
  },
  가톨릭대학교: {
    mark: "CUK",
    from: "#0c2e86",
    to: "#5069a8",
    ci: "/catholic-university.webp",
  },
  울산대학교: {
    mark: "UOU",
    from: "#00a563",
    to: "#47be8f",
    ci: "/ulsan-university.gif",
  },
  이화여자대학교: {
    mark: "EWHA",
    from: "#006b3d",
    to: "#479473",
    ci: "/ewha-womans-university.webp",
  },
  중앙대학교: {
    mark: "CAU",
    from: "#2c71bc",
    to: "#6799cf",
    ci: "/chung-ang-university.webp",
  },
  경희대학교: {
    mark: "KHU",
    from: "#9c1d1f",
    to: "#b85c5e",
    ci: "/kyung-hee-university.png",
  },
  숙명여자대학교: {
    mark: "SMWU",
    from: "#0971cf",
    to: "#4e99dc",
    ci: "/sookmyung-womens-university.png",
  },
  한양대학교: {
    mark: "HANYANG",
    from: "#0b4e90",
    to: "#4f80af",
    ci: "/hanyang-university.png",
  },
  가톨릭관동대학교: {
    mark: "CKU",
    from: "#007f98",
    to: "#54a9b9",
    ci: "/catholic-kwandong-university.png",
  },
  강원대학교: {
    mark: "KNU",
    from: "#2c5fa5",
    to: "#6d91c3",
    ci: "/kangwon-national-university.png",
  },
  경상국립대학교: {
    mark: "GNU",
    from: "#008fd0",
    to: "#59b4dd",
    ci: "/gyeongsang-national-university.png",
  },
  고신대학교: {
    mark: "KOSIN",
    from: "#15539b",
    to: "#6087b7",
    ci: "/kosin-university.png",
  },
  대구가톨릭대학교: {
    mark: "DCU",
    from: "#073b83",
    to: "#5a76a5",
    ci: "/daegu-catholic-university.png",
  },
  부산대학교: {
    mark: "PNU",
    from: "#1264a3",
    to: "#5e95bd",
    ci: "/pusan-national-university.png",
  },
  원광대학교: {
    mark: "WKU",
    from: "#17447d",
    to: "#607da4",
    ci: "/wonkwang-university.webp",
  },
  인제대학교: {
    mark: "INJE",
    from: "#242021",
    to: "#686465",
    ci: "/inje-university.png",
  },
  전남대학교: {
    mark: "CNU",
    from: "#00994b",
    to: "#55b17f",
    ci: "/chonnam-national-university.png",
  },
  전북대학교: {
    mark: "JBNU",
    from: "#07539d",
    to: "#687fab",
    ci: "/jeonbuk-national-university.png",
  },
  한림대학교: {
    mark: "HALLYM",
    from: "#00549c",
    to: "#5489b9",
    ci: "/hallym-university.png",
  },
  단국대학교: {
    mark: "DANKOOK",
    from: "#0a57a1",
    to: "#5e8fbd",
    ci: "/dankook-university.png",
  },
  "단국대학교(천안)": {
    mark: "DANKOOK",
    from: "#0a57a1",
    to: "#5e8fbd",
    ci: "/dankook-university.png",
  },
  조선대학교: {
    mark: "CHOSUN",
    from: "#2863b5",
    to: "#6b94ca",
    ci: "/chosun-university.png",
  },
  가천대학교: {
    mark: "GACHON",
    from: "#07519e",
    to: "#5d89bb",
    ci: "/gachon-university.png",
  },
  대구한의대학교: {
    mark: "DHU",
    from: "#293276",
    to: "#696f9f",
    ci: "/daegu-haany-university.png",
  },
  대전대학교: {
    mark: "DJU",
    from: "#007d4c",
    to: "#57a681",
    ci: "/daejeon-university.png",
  },
  동국대학교: {
    mark: "DONGGUK",
    from: "#665b54",
    to: "#958b85",
    ci: "/dongguk-university.png",
  },
  "동국대학교(WISE)": {
    mark: "DONGGUK WISE",
    from: "#665b54",
    to: "#958b85",
    ci: "/dongguk-university.png",
  },
  동신대학교: {
    mark: "DONGSHIN",
    from: "#2b59aa",
    to: "#708ec6",
    ci: "/dongshin-university.png",
  },
  상지대학교: {
    mark: "SANGJI",
    from: "#0a56a8",
    to: "#668cc0",
    ci: "/sangji-university.png",
  },
  세명대학교: {
    mark: "SEMYUNG",
    from: "#2861b2",
    to: "#6c91c7",
    ci: "/semyung-university.png",
  },
  건국대학교: {
    mark: "KONKUK",
    from: "#248f1c",
    to: "#69ad64",
    ci: "/konkuk-university.png",
  },
  "건국대학교(글로컬)": {
    mark: "KONKUK",
    from: "#248f1c",
    to: "#69ad64",
    ci: "/konkuk-university.png",
  },
  경성대학교: {
    mark: "KYUNGSUNG",
    from: "#a97800",
    to: "#cba546",
    ci: "/kyungsung-university.png",
  },
  동덕여자대학교: {
    mark: "DONGDUK",
    from: "#87103d",
    to: "#ad5778",
    ci: "/dongduk-womens-university.png",
  },
  목포대학교: {
    mark: "MNU",
    from: "#009b99",
    to: "#55b4b2",
    ci: "/mokpo-national-university.png",
  },
  충남대학교: {
    mark: "CNU",
    from: "#0a479c",
    to: "#5c7fb2",
    ci: "/chungnam-national-university.png",
  },
  충북대학교: {
    mark: "CBNU",
    from: "#a50042",
    to: "#c2527e",
    ci: "/chungbuk-national-university.png",
  },
  한국과학기술원: {
    mark: "KAIST",
    from: "#0d5599",
    to: "#5990be",
    ci: "/kaist.png",
  },
  KAIST: {
    mark: "KAIST",
    from: "#0d5599",
    to: "#5990be",
    ci: "/kaist.png",
  },
  포항공과대학교: {
    mark: "POSTECH",
    from: "#a90052",
    to: "#cb558e",
    ci: "/postech.png",
  },
  POSTECH: {
    mark: "POSTECH",
    from: "#a90052",
    to: "#cb558e",
    ci: "/postech.png",
  },
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

function formatBranch(branch: string) {
  const trimmed = branch.trim();
  if (!trimmed) return "지점 미지정";
  return trimmed.replace(/\s*지점$/, "");
}

function ScholarshipCard({ recipient }: { recipient: ScholarshipRecipient }) {
  const brand = getBrand(recipient.row.university);
  const group = GROUP_STYLES[recipient.group];

  return (
    <article
      tabIndex={0}
      className="scholarship-card group relative h-[210px] w-[310px] shrink-0 overflow-hidden rounded-2xl p-5 text-white shadow-[0_12px_28px_rgba(7,29,73,0.16)] outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
      style={{
        background: `linear-gradient(135deg, ${brand.from}, ${brand.to})`,
      }}
    >
      {brand.ci ? (
        <Image
          src={brand.ci}
          alt=""
          width={190}
          height={190}
          aria-hidden="true"
          unoptimized={brand.ci.endsWith(".gif")}
          className="pointer-events-none absolute -right-4 top-2 h-[190px] w-[190px] object-contain opacity-[0.32] mix-blend-multiply"
        />
      ) : (
        <div className="pointer-events-none absolute -right-3 top-7 rotate-[-8deg] text-[42px] font-black tracking-[-0.08em] text-white/10">
          {brand.mark}
        </div>
      )}
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
            <div className="flex max-w-[132px] flex-col items-end gap-1">
              <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm">
                {recipient.row.track}
              </span>
              <span
                title={formatBranch(recipient.row.branch)}
                className="max-w-full truncate rounded-full border border-white/20 bg-black/10 px-2.5 py-1 text-[9px] font-bold text-white/85 backdrop-blur-sm"
              >
                {formatBranch(recipient.row.branch)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex translate-y-2 flex-col bg-[#071d49]/95 p-4 opacity-0 backdrop-blur-sm transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-black">중복 합격 대학</h4>
          <p className="text-[8px] font-bold tracking-[0.08em] text-[#89d1f2]">OTHER ADMISSIONS</p>
        </div>
        {recipient.otherAdmissions.length === 0 ? (
          <p className="mt-auto text-[11px] font-medium text-white/65">추가로 등록된 합격 대학이 없습니다.</p>
        ) : (
          <ul className="mt-2">
            {recipient.otherAdmissions.slice(0, 5).map((admission) => (
              <li
                key={`${admission.id}-${admission.university}-${admission.dept}`}
                className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_auto] items-center gap-x-2 border-b border-white/10 py-1.5 last:border-0"
              >
                <p className="truncate text-[11px] font-black leading-4">{admission.university}</p>
                <p className="truncate border-l border-white/20 pl-2 text-[10px] font-medium leading-4 text-white/80">{admission.dept}</p>
                <p className="border-l border-white/20 pl-2 text-[10px] font-bold leading-4 text-[#89d1f2]">{admission.track}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function ScholarshipSection({ rows, admissionYear }: ScholarshipSectionProps) {
  const [listView, setListView] = useState(false);
  const [admissionsTooltip, setAdmissionsTooltip] = useState<AdmissionsTooltipState | null>(null);
  const [noticeTooltip, setNoticeTooltip] = useState<NoticeTooltipState | null>(null);
  const currentYearRows = useMemo(
    () => rows.filter((row) => (row.admissionYear ?? 2026) === admissionYear),
    [admissionYear, rows],
  );
  const recipients = useMemo(
    () => selectScholarshipRecipients(currentYearRows),
    [currentYearRows],
  );
  const totalAmount = recipients.reduce((sum, item) => sum + item.amount, 0);
  const carouselItems = useMemo(() => {
    if (recipients.length === 0) return [];
    const repeats = Math.max(1, Math.ceil(6 / recipients.length));
    const loop = Array.from({ length: repeats }, () => recipients).flat();
    return [...loop, ...loop];
  }, [recipients]);
  const carouselDuration = Math.max(70, (carouselItems.length / 2) * 11);

  const showAdmissionsTooltip = (element: HTMLElement, recipient: ScholarshipRecipient) => {
    if (recipient.otherAdmissions.length === 0) return;

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 256;
    const tooltipHeight = 40 + recipient.otherAdmissions.length * 44;
    const belowTop = rect.bottom + 8;
    const top = belowTop + tooltipHeight <= window.innerHeight - 12
      ? belowTop
      : Math.max(12, rect.top - tooltipHeight - 8);
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - tooltipWidth - 12),
    );

    setAdmissionsTooltip({ recipient, top, left });
  };

  const showNoticeTooltip = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const width = Math.min(480, window.innerWidth - 24);
    const estimatedHeight = 430;
    const belowTop = rect.bottom + 10;
    const top = belowTop + estimatedHeight <= window.innerHeight - 12
      ? belowTop
      : Math.max(12, Math.min(rect.top - estimatedHeight - 10, window.innerHeight - estimatedHeight - 12));
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - width - 12),
    );

    setNoticeTooltip({ top, left, width });
  };

  return (
    <>
      <section
        id="scholarship-section"
        className="mb-12 scroll-mt-24"
      >
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button
              type="button"
              className="flex cursor-help items-center gap-1.5 text-left text-xl font-black text-[#071d49] outline-none focus-visible:ring-2 focus-visible:ring-[#4da8dd] focus-visible:ring-offset-2"
              aria-describedby="scholarship-notice"
              onMouseEnter={(event) => showNoticeTooltip(event.currentTarget)}
              onMouseLeave={() => setNoticeTooltip(null)}
              onMouseDown={(event) => event.preventDefault()}
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) {
                  showNoticeTooltip(event.currentTarget);
                }
              }}
              onBlur={() => setNoticeTooltip(null)}
            >
              {admissionYear} 총 1억 장학금 대상자
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#8ba3b8] text-[9px] font-black text-[#52728e]">
                i
              </span>
            </button>
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
                  <div className="min-w-[820px]">
                    <div className="grid grid-cols-[1.1fr_1.2fr_.8fr_.75fr_.6fr_.7fr] bg-[#f7fafc] px-4 py-2.5 text-[10px] font-bold text-slate-500">
                      <span>합격 대학</span>
                      <span>학과</span>
                      <span>이름</span>
                      <span>지점</span>
                      <span>전형</span>
                      <span className="text-right">장학금액</span>
                    </div>
                    {groupRecipients.map((recipient) => (
                      <div
                        key={`${recipient.studentKey}-${recipient.row.id}`}
                        className="grid grid-cols-[1.1fr_1.2fr_.8fr_.75fr_.6fr_.7fr] items-center border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600"
                      >
                        <span className="font-bold text-[#071d49]">{recipient.row.university}</span>
                        <span>{recipient.row.dept}</span>
                        <span className="relative w-fit">
                          <span
                            tabIndex={recipient.otherAdmissions.length > 0 ? 0 : undefined}
                            onMouseEnter={(event) => showAdmissionsTooltip(event.currentTarget, recipient)}
                            onMouseLeave={() => setAdmissionsTooltip(null)}
                            onFocus={(event) => showAdmissionsTooltip(event.currentTarget, recipient)}
                            onBlur={() => setAdmissionsTooltip(null)}
                            className={recipient.otherAdmissions.length > 0 ? "cursor-help border-b border-dotted border-slate-400 font-bold outline-none" : "font-bold"}
                          >
                            {recipient.row.name}
                          </span>
                        </span>
                        <span className="truncate font-semibold text-[#315d81]" title={formatBranch(recipient.row.branch)}>
                          {formatBranch(recipient.row.branch)}
                        </span>
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
          <div
            className="scholarship-track flex w-max gap-5 px-5"
            style={{ animationDuration: `${carouselDuration}s` }}
          >
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
      {noticeTooltip && typeof document !== "undefined" && createPortal(
        <div
          id="scholarship-notice"
          role="tooltip"
          className="pointer-events-none fixed z-[110] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl bg-[#071d49] p-5 text-left text-white shadow-[0_20px_50px_rgba(7,29,73,0.32)]"
          style={{
            top: noticeTooltip.top,
            left: noticeTooltip.left,
            width: noticeTooltip.width,
          }}
        >
          <span className="block text-[10px] font-black tracking-[0.12em] text-[#89d1f2]">
            SCHOLARSHIP NOTICE
          </span>
          <span className="mt-1 block text-sm font-black">{admissionYear} 총 1억 장학금 안내</span>

          <span className="mt-3 block rounded-xl bg-white/10 px-3.5 py-3 text-[11px] font-bold leading-5">
            <strong className="block">자동 선정된 장학금 대상자로 최종 확정 상태가 아닙니다.</strong>
            <strong className="block">자세한 내용은 추후 본사 담당자가 안내할 예정입니다.</strong>
          </span>

          <span className="mt-4 block text-[11px] font-medium leading-[1.65] text-white/85">
            <strong className="mb-1 block text-xs text-white">지급 기준</strong>
            총 1억 장학금은 재원기간별 장학금 차등 지급 없이 각 구간별 최대 200만 원·70만 원·50만 원을 지급합니다.
          </span>

          <span className="mt-4 block text-[11px] font-medium leading-[1.65] text-white/85">
            <strong className="mb-1 block text-xs text-white">충족 조건</strong>
            <span className="block pl-1">1. 본인의 홍보대사 활동 동의</span>
            <span className="block pl-4 text-[10px] text-white/60">합격 수기 및 인터뷰의 마케팅 활용 등</span>
            <span className="mt-1 block pl-1">2. 재원기간 만 3개월 이상 등록생</span>
            <span className="mt-1 block pl-1">3. 해당 대학에 최종 합격한 학생</span>
            <span className="block pl-4 text-[10px] text-white/60">최종 합격증 제출 필수</span>
          </span>

          <span className="mt-4 block border-t border-white/10 pt-3 text-[11px] font-medium leading-[1.7] text-white/85">
            <span className="block">• 중복 지급 제외</span>
            <span className="block">• 제세공과금 본인 부담</span>
            <span className="block">• 지급 시기: 3월 중 최종 선발 후, 4월 중 지급 예정</span>
          </span>

          <span className="mt-3 block rounded-lg bg-[#0d2a5e] px-3 py-2.5 text-[10px] font-medium leading-4 text-white/70">
            장학금은 총 1억 원 내에서 그룹별 순차 지급 방식으로 진행되며, 최종 선발 인원 및 예산 상황에 따라 지급 금액이 조정될 수 있습니다.
          </span>
        </div>,
        document.body,
      )}
      {admissionsTooltip && typeof document !== "undefined" && createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[100] w-64 rounded-xl bg-[#071d49] p-3 text-left text-white shadow-[0_16px_40px_rgba(7,29,73,0.3)]"
          style={{ top: admissionsTooltip.top, left: admissionsTooltip.left }}
        >
          <span className="block text-[10px] font-black text-[#89d1f2]">중복 합격 대학</span>
          {admissionsTooltip.recipient.otherAdmissions.map((admission) => (
            <span
              key={`${admission.id}-${admission.university}-${admission.dept}`}
              className="mt-2 block border-t border-white/10 pt-2"
            >
              <span className="block text-[11px] font-black">{admission.university}</span>
              <span className="mt-0.5 block text-[10px] font-medium text-white/65">
                {admission.dept} · {admission.track}
              </span>
            </span>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
