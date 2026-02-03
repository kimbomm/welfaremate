import type { Metadata } from "next";
import { Toaster } from "sonner";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "복지메이트 관리자",
  description: "복지메이트 서비스 관리 페이지",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
