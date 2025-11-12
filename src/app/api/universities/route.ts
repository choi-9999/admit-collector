import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // public/universities.json 파일 읽기
    const filePath = path.join(process.cwd(), 'public', 'universities.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        error: 'universities.json 파일을 찾을 수 없습니다.',
      }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const universities = JSON.parse(fileContent);

    return NextResponse.json(universities);
  } catch (error: any) {
    console.error('❌ Universities API Error:', error);
    return NextResponse.json(
      { error: '대학 데이터를 불러올 수 없습니다.', message: error.message },
      { status: 500 }
    );
  }
}