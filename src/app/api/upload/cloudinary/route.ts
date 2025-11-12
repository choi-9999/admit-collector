import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const folder = (form.get('folder') as string) || undefined;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'NO_FILE' }, { status: 400 });
    }

    // 1) 파일명/확장자 파싱 (프론트에서 지정한 "이름_대학_날짜.확장자" 기대)
    //    - public_id에는 확장자를 넣지 않습니다.
    const incomingName = (file as any).name || 'upload';
    const m = incomingName.match(/^(.+?)\.([^.]+)$/);
    const base = (m?.[1] || incomingName).replace(/[\/\\]/g, '_'); // 슬래시 금지
    const ext  = (m?.[2] || '').toLowerCase();

    // 2) 버퍼 변환
    const buffer = Buffer.from(await file.arrayBuffer());

    // 3) 업로드 (public_id + format으로 "파일명.확장자" 고정)
    const uploaded = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,                 // admit/지점/연/월/일
          resource_type: 'auto',  // 이미지/문서/영상 자동
          public_id: base,        // ✅ 확장자 없는 파일명
          format: ext || undefined, // ✅ 확장자(있으면 적용)
          overwrite: true,        // 같은 이름이면 덮어쓰기 (원하면 false)
          unique_filename: false, // 무작위 suffix 방지
          use_filename: false,    // public_id를 그대로 사용
        },
        (err, result) => {
          if (err || !result) return reject(err || new Error('Upload failed'));
          resolve(result);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({ ok: true, file: uploaded });
  } catch (e: any) {
    console.error('[Cloudinary Upload Error]', e);
    return NextResponse.json(
      { ok: false, error: 'UPLOAD_FAILED', message: e?.message || 'Unknown' },
      { status: 500 }
    );
  }
}
