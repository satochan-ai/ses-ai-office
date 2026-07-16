import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SES AI Office Dashboard",
  description: "SES営業・採用業務をAIで加速",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
