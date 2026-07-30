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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const isAdmin =
      req.headers.get("authorization") === "Bearer admin_token_v1";
    const sheets = sheetsClient();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1:N`,
    });
    const rows = data.values || [];

    if (rows.length <= 1) {
      return NextResponse.json({ ok: false, error: "empty" }, { status: 404 });
    }

    const header = rows[0];
    const idx: Record<string, number> = Object.fromEntries(
      header.map((value, index) => [value, index]),
    );
    const targetIndex = rows.findIndex(
      (row, index) => index > 0 && row[idx.id] === id,
    );

    if (targetIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 },
      );
    }

    const status = rows[targetIndex][idx.status] || "대기중";
    if (!isAdmin && status !== "대기중") {
      return NextResponse.json(
        { ok: false, error: "대기중인 항목만 삭제할 수 있습니다." },
        { status: 403 },
      );
    }

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      fields: "sheets.properties",
    });
    const sheetId = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === TAB,
    )?.properties?.sheetId;

    if (typeof sheetId !== "number") {
      throw new Error("admit sheet not found");
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: targetIndex,
                endIndex: targetIndex + 1,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "delete failed";
    console.error("[DELETE /api/admits/:id]", error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
