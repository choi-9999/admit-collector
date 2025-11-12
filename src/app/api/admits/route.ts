import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';
type AdmitStatus = '대기중' | '승인' | '반려';

interface AdmitRow {
  id: string;
  name: string;
  university: string;
  universityCode: string;
  dept: string;
  deptCode: string;
  track: '수시' | '정시';
  branch: string;
  status: AdmitStatus;
  rejectReason: string | null;
  fileUrl: string;
  createdAt: number;
  updatedAt: number;
}

export async function POST(req: Request) {
  const b = await req.json() as {
    name: string; university: string; universityCode?: string;
    dept: string; deptCode?: string; track: '수시'|'정시';
    branch: string; fileUrl: string;
  };

  const id = crypto.randomUUID();
  const now = Date.now();

  const row: AdmitRow = {
    id,
    name: b.name.trim(),
    university: b.university.trim(),
    universityCode: b.universityCode ?? '',
    dept: b.dept.trim(),
    deptCode: b.deptCode ?? '000',
    track: b.track,
    branch: b.branch,
    status: '대기중',
    rejectReason: null,
    fileUrl: b.fileUrl,
    createdAt: now,
    updatedAt: now,
  };

  await redis.set(`admit:${id}`, JSON.stringify(row));
  await redis.zadd('admit:index:all', { score: now, member: id });
  await redis.zadd(`admit:index:branch:${row.branch}:status:${row.status}`, { score: now, member: id });

  return NextResponse.json({ ok: true, row });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const branch = searchParams.get('branch');
  const status = searchParams.get('status'); // '승인' | '반려' | '대기중'
  const limit  = Number(searchParams.get('limit') ?? '50');
  const cursor = Number(searchParams.get('cursor') ?? '0');

  const key = branch && status
    ? `admit:index:branch:${branch}:status:${status}`
    : 'admit:index:all';

  const ids = await redis.zrange<string[]>(key, -(cursor + limit), -1 - cursor);
  ids.reverse();

  const rows = await Promise.all(
    ids.map(async (id) => JSON.parse((await redis.get<string>(`admit:${id}`)) || "null"))
  );
  const nextCursor = ids.length < limit ? null : cursor + limit;

  return NextResponse.json({ ok: true, rows, nextCursor });
}
