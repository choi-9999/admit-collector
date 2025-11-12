import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';


export const runtime = 'nodejs';


export async function POST(req: Request) { 
try {
const { publicId } = await req.json();
if (!publicId) {
return NextResponse.json({ error: 'NO_PUBLIC_ID', message: 'publicId가 필요합니다' }, { status: 400 });
}


const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
return NextResponse.json({ ok: true, result });
} catch (e: any) {
return NextResponse.json(
{ error: 'DELETE_FAILED', message: e?.message || 'Unknown error' },
{ status: 500 }
);
}
}