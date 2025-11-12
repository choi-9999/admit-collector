import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';

// MIME → 확장자 보정 테이블
const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

function sanitizeBase(s: string) {
  // public_id에는 확장자 제외, 슬래시/역슬래시 제거, 공백/특수문자 안전치환
  return s
    .replace(/[\/\\]/g, '_')
    .replace(/[^\w\-가-힣.]+/g, '_')
    .replace(/\.+$/g, ''); // 끝 점 방지
}

// 파일명에서 base/ext 분리
function splitName(filename: string | undefined) {
  if (!filename) return { base: 'upload', ext: '' };
  const m = filename.match(/^(.+?)\.([^.]+)$/);
  if (!m) return { base: filename, ext: '' };
  return { base: m[1], ext: m[2].toLowerCase() };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // 필수: 파일
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: 'NO_FILE' }, { status: 400 });
    }

    // 선택: 저장 폴더 / publicId(확장자 없이) — 둘 다 없으면 자동 생성
    const folder = (form.get('folder') as string) || undefined;
    const publicIdFromForm = (form.get('publicId') as string) || undefined;

    // 파일명 기반 base/ext 추출
    const incomingName = (file as any).name as string | undefined;
    const { base: rawBase, ext: rawExt } = splitName(incomingName);

    // 확장자 결정: 파일명 우선, 없으면 MIME으로 보정
    const ext =
      rawExt ||
      MIME_EXT[file.type] ||
      ''; // Cloudinary가 format을 결정하도록 비워둘 수도 있음

    // public_id 결정 우선순위: publicIdFromForm → 파일명 base → 'upload'
    const base = sanitizeBase(publicIdFromForm || rawBase || 'upload');

    // 업로드 버퍼
    const buffer = Buffer.from(await file.arrayBuffer());

    // 업로드
    const uploaded = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,                  // 예: admit/지점/연/월/일
          public_id: base,         // ✅ 확장자 없는 파일명
          format: ext || undefined, // ✅ 확장자(있으면 적용)
          resource_type: 'auto',   // 이미지/문서/영상 자동
          unique_filename: false,  // 랜덤 접미사 방지
          use_filename: false,     // public_id 그대로 사용
          overwrite: false,         // 동일 이름 덮어쓰기 (원하면 false)
        },
        (err, result) => {
          if (err || !result) return reject(err || new Error('Upload failed'));
          resolve(result);
        }
      );
      stream.end(buffer);
    });

    // 최종 파일명(확장자 포함) 계산: Cloudinary가 정한 format 사용
    const finalFormat: string = uploaded.format;
    const publicId: string = uploaded.public_id; // 폴더 포함 public_id
    const finalName = `${publicId.split('/').pop()}.${finalFormat}`;

    return NextResponse.json({
      ok: true,
      message: '업로드 성공',
      file: {
        secure_url: uploaded.secure_url as string,
        public_id: publicId as string,         // 예: admit/강남/2025/11/12/홍길동_서울대_20251112
        format: finalFormat,                   // 예: 'pdf' | 'jpg' | 'png'
        final_filename: finalName,             // 예: 홍길동_서울대_20251112.pdf
        bytes: uploaded.bytes as number,
        resource_type: uploaded.resource_type as string,
        folder: folder ?? null,
      },
    });
  } catch (e: any) {
    console.error('[Cloudinary Upload Error]', e);
    return NextResponse.json(
      { ok: false, error: 'UPLOAD_FAILED', message: e?.message || 'Unknown' },
      { status: 500 }
    );
  }
}
