import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const TAB = "admit";

function sheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// ✅ Next 15: context.params 는 Promise 로 들어옴
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // ← 반드시 await
    const { status, reason }:{ status: "대기중"|"승인"|"반려"; reason?: string } = await req.json();

    const sheets = sheetsClient();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1:N`,
    });

    const rows = data.values || [];
    if (rows.length <= 1) {
      return NextResponse.json({ ok:false, error:"empty" }, { status:404 });
    }

    const header = rows[0];
    const idx: Record<string, number> = Object.fromEntries(header.map((h, i) => [h, i]));

    const targetIndex = rows.findIndex((r, i) => i>0 && r[idx.id] === id);
    if (targetIndex === -1) {
      return NextResponse.json({ ok:false, error:"not found" }, { status:404 });
    }

    const rowNum = targetIndex + 1;
    const updatedAt = new Date().toISOString();
    const col = (n:number) => String.fromCharCode("A".charCodeAt(0) + n);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!${col(idx.status)}${rowNum}:${col(idx.updatedAt)}${rowNum}`,
      valueInputOption: "RAW",
      requestBody: { values: [[status, reason || "", updatedAt]] },
    });

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    console.error("[PATCH /api/admits/:id/status]", e?.response?.data || e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
