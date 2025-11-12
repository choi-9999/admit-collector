// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // ✅ 프로덕션 빌드 시 ESLint 에러가 있어도 빌드 진행
    ignoreDuringBuilds: true,
  },
  // (선택) TS 타입 에러까지 임시로 무시하려면 아래도 추가
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
