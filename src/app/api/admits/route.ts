// app/api/admits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const TAB = "admit";
const HEADER = [
  "id","name","university","universityCode","dept","deptCode",
  "track","branch","fileUrl","filePublicId","status","rejectReason",
  "createdAt","updatedAt"
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

    const sheets = sheetsClient();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1:N`,
    });

    const rows = data.values || [];
    if (rows.length <= 1) return NextResponse.json({ ok: true, rows: [] });

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
    }));

    const filtered = branch ? body.filter(b => b.branch === branch) : body;
    filtered.sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||"")); // 최신순

    return NextResponse.json({ ok: true, rows: filtered });
  } catch (e:any) {
    console.error("[GET /api/admits]", e?.response?.data || e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const id = nanoid();
    const now = new Date().toISOString();

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
    ];

    const sheets = sheetsClient();
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
      },
    });
  } catch (e:any) {
    console.error("[POST /api/admits]", e?.response?.data || e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
