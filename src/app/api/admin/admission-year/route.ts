import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentAdmissionYear,
  migrateLegacyAdmissionYears,
  setCurrentAdmissionYear,
} from "@/lib/admissionYear";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest) {
  return req.headers.get("authorization") === "Bearer admin_token_v1";
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const [{ migratedCount }, currentYear] = await Promise.all([
      migrateLegacyAdmissionYears(),
      getCurrentAdmissionYear(),
    ]);
    return NextResponse.json({ ok: true, currentYear, migratedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "설정을 불러오지 못했습니다.";
    console.error("[GET /api/admin/admission-year]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const { year } = await req.json();
    const parsed = Number(year);
    if (!Number.isInteger(parsed) || parsed < 2020 || parsed > 2100) {
      return NextResponse.json(
        { ok: false, error: "올바른 모집연도를 입력해 주세요." },
        { status: 400 },
      );
    }

    const currentYear = await setCurrentAdmissionYear(parsed);
    return NextResponse.json({ ok: true, currentYear });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "설정을 저장하지 못했습니다.";
    console.error("[PATCH /api/admin/admission-year]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
