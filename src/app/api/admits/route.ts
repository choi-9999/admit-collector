// app/api/admits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { nanoid } from "nanoid";
import { getCurrentAdmissionYear, LEGACY_ADMISSION_YEAR } from "@/lib/admissionYear";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const TAB = "admit";
const HEADER = [
  "id","name","university","universityCode","dept","deptCode",
  "track","branch","fileUrl","filePublicId","status","rejectReason",
  "createdAt","updatedAt","admissionYear"
];

function sheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const branch = url.searchParams.get("branch") || undefined;
    const yearParam = url.searchParams.get("year") || undefined;
    const currentYear = await getCurrentAdmissionYear();
    const requestedYear = yearParam === "current"
      ? currentYear
      : yearParam && Number.isInteger(Number(yearParam))
        ? Number(yearParam)
        : undefined;

    const sheets = sheetsClient();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1:O`,
    });

    const rows = data.values || [];
    if (rows.length <= 1) {
      return NextResponse.json({ ok: true, rows: [], currentYear });
    }

    const idx = Object.fromEntries(HEADER.map((h, i) => [h, i]));
    const body = rows.slice(1).map((r) => ({
      id: r[idx.id] || "",
      name: r[idx.name] || "",
      university: r[idx.university] || "",
      universityCode: r[idx.universityCode] || "",
      dept: r[idx.dept] || "",
      deptCode: r[idx.deptCode] || "000",
      track: (r[idx.track] || "수시") as "수시" | "정시",
      branch: r[idx.branch] || "",
      fileUrl: r[idx.fileUrl] || "",
      filePublicId: r[idx.filePublicId] || "",
      status: (r[idx.status] || "대기중") as "대기중" | "승인" | "반려",
      rejectReason: r[idx.rejectReason] || "",
      createdAt: r[idx.createdAt] || "",
      updatedAt: r[idx.updatedAt] || "",
      admissionYear: Number(r[idx.admissionYear]) || LEGACY_ADMISSION_YEAR,
    }));

    const filtered = body.filter((row) => {
      if (branch && row.branch !== branch) return false;
      if (requestedYear && row.admissionYear !== requestedYear) return false;
      return true;
    });
    filtered.sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||"")); // 최신순

    return NextResponse.json({ ok: true, rows: filtered, currentYear });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "합격자 데이터를 불러오지 못했습니다.";
    console.error("[GET /api/admits]", error);
    return NextResponse.json({ ok:false, error:message }, { status:500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const admissionYear = await getCurrentAdmissionYear();
    const sheets = sheetsClient();
    const nowDate = new Date();
    const now = nowDate.toISOString();

    // UI 잠금이 적용되지 않는 오래된 화면이나 네트워크 재시도에서도
    // 동일 제출이 연속 저장되지 않도록 최근 요청을 한 번 더 확인한다.
    const { data: existingData } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A2:O`,
    });
    const recentDuplicate = (existingData.values || []).some((existingRow) => {
      const createdAt = Date.parse(existingRow[12] || "");
      return (
        Number.isFinite(createdAt) &&
        nowDate.getTime() - createdAt >= 0 &&
        nowDate.getTime() - createdAt < 60_000 &&
        (existingRow[1] || "").trim() === String(payload.name || "").trim() &&
        (existingRow[2] || "").trim() === String(payload.university || "").trim() &&
        (existingRow[4] || "").trim() === String(payload.dept || "").trim() &&
        (existingRow[6] || "").trim() === String(payload.track || "").trim() &&
        (existingRow[7] || "").trim() === String(payload.branch || "").trim() &&
        (Number(existingRow[14]) || LEGACY_ADMISSION_YEAR) === admissionYear
      );
    });

    if (recentDuplicate) {
      return NextResponse.json(
        { ok: false, error: "동일한 합격증이 이미 등록 처리되었습니다." },
        { status: 409 },
      );
    }

    const id = nanoid();

    const row = [
      id,
      payload.name,
      payload.university,
      payload.universityCode || "",
      payload.dept,
      payload.deptCode || "000",
      payload.track,
      payload.branch,
      payload.fileUrl || "",
      payload.filePublicId || "",
      "대기중",
      "",
      now,
      now,
      admissionYear,
    ];

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    if (!res.data.updates?.updatedRows) {
      throw new Error("append failed");
    }

    return NextResponse.json({
      ok: true,
      row: {
        id,
        ...payload,
        status: "대기중",
        rejectReason: "",
        createdAt: now,
        updatedAt: now,
        admissionYear,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "합격자 데이터를 저장하지 못했습니다.";
    console.error("[POST /api/admits]", error);
    return NextResponse.json({ ok:false, error:message }, { status:500 });
  }
}
