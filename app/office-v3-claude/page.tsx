import type { Metadata } from "next";
import ClaudeOfficeV3 from "@/components/office-v3-claude/ClaudeOfficeV3";

export const metadata: Metadata = {
  title: "SES AI Office V3 | AI社員13名による業務デモ",
  description: "AI社員13名がSES営業・採用・マッチング・稼働フォローを分担し、人間責任者の承認までを5つの固定シナリオで体験できるフロントエンドデモです。",
};

export default function OfficeV3ClaudePage() {
  return <ClaudeOfficeV3 />;
}
