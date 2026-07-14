import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MZ 따라잡기",
  description: "10대와 20대의 유튜브 트렌드를 세대별 피드로 확인하는 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
