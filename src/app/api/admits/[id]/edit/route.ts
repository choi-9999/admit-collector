// app/api/admits/[id]/edit/route.ts
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

type EditBody = {
  name?: string;
  university?: string;
  universityCode?: string;
  dept?: string;
  deptCode?: string;
  track?: "수시" | "정시";
  branch?: string;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // 🔹 여기: params가 Promise
) {
  try {
    const { id } = await params;  // 🔹 여기: 한 번 await 해서 꺼내쓰기

    const body: EditBody = await req.json();
    const sheets = sheetsClient();

    // ✅ 전체 읽어서 id가 있는 행(인덱스) 찾기
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
      header.map((h, i) => [h, i]),
    );

    const targetIndex = rows.findIndex(
      (r, i) => i > 0 && r[idx.id] === id,   // 🔹 여기: params.id → id
    );

    if (targetIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 },
      );
    }

    const rowNum = targetIndex + 1; // 1-based

    // 기존 행 기반으로 patch 적용
    const existing = rows[targetIndex];
    const updatedRow = [...existing];

    const setIf = (key: keyof EditBody) => {
      const v = body[key];
      if (typeof v === "undefined") return;
      const i = idx[key as string];
      if (typeof i !== "number") return;
      updatedRow[i] = v;
    };

    setIf("name");
    setIf("university");
    setIf("universityCode");
    setIf("dept");
    setIf("deptCode");
    setIf("track");
    setIf("branch");

    // updatedAt 갱신
    const updatedAt = new Date().toISOString();
    if (typeof idx.updatedAt === "number") {
      updatedRow[idx.updatedAt] = updatedAt;
    }

    // A~마지막 컬럼까지 한 줄 전체 업데이트
    const col = (n: number) =>
      String.fromCharCode("A".charCodeAt(0) + n); // N까지면 안전
    const lastCol = col(header.length - 1);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A${rowNum}:${lastCol}${rowNum}`,
      valueInputOption: "RAW",
      requestBody: { values: [updatedRow] },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[PATCH /api/admits/:id/edit]", e);
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 },
    );
  }
}
