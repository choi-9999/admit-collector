import { NextResponse } from 'next/server';
type AdmitStatus = '대기중' | '승인' | '반려';

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const auth = req.headers.get('authorization') || '';
  if (!auth.endsWith('admin_token_v1')) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });
  }

  const status = body?.status as AdmitStatus | undefined;
  const reason = (body?.reason as string | undefined)?.trim();
  if (!status) {
    return NextResponse.json({ ok: false, error: 'MISSING_STATUS' }, { status: 400 });
  }
  if (status === '반려' && !reason) {
    return NextResponse.json({ ok: false, error: 'MISSING_REASON' }, { status: 400 });
  }

  // TODO: DB 반영
  return NextResponse.json({ ok: true, id, status, reason });
}
