import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AppDialogProvider } from "@/components/AppDialogProvider";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: "variable",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETOOS 247 합격자 취합",
  description: "이투스247 지점별 대학 합격자 등록 및 현황 관리 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKr.variable} ${geistMono.variable} antialiased`}
      >
        <AppDialogProvider>{children}</AppDialogProvider>
      </body>
    </html>
  );
}
