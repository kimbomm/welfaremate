import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "복지메이트 - 나에게 맞는 복지 혜택 찾기",
  description:
    "복잡한 복지 정보를 한눈에, 개인정보 걱정 없는 AI 맞춤형 복지 비서",
  keywords: ["복지", "혜택", "청년", "지원금", "보조금"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3182F6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 antialiased">
        <div className="mx-auto min-h-screen max-w-[720px] bg-white">
          {children}
        </div>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
