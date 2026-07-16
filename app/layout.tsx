import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SES AI Office",
  description: "営業・採用・マッチングをAI社員と動かす",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
