import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// 데이터 저장
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, data } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    // id는 unique key (예: admit_홍길동_서울대)
    await redis.set(id, JSON.stringify(data));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Redis Save Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 전체 데이터 조회
export async function GET() {
  try {
    const keys = await redis.keys("*"); // 전체 키 조회

    const values = await Promise.all(
      keys.map(async (k) => {
        const v = await redis.get(k);
        // ⚠️ 타입 단언: unknown → string
        return v ? JSON.parse(v as string) : null;
      })
    );

    // null 값 필터링
    const filtered = values.filter(Boolean);

    return NextResponse.json(filtered);
  } catch (err: any) {
    console.error("Redis Get Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
