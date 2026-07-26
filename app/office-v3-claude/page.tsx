import type { Metadata } from "next";
import ClaudeOfficeV3 from "@/components/office-v3-claude/ClaudeOfficeV3";

export const metadata: Metadata = {
  title: "Isometric AI Office V3 | SES AI Office",
  description: "一つの大きなフロアに11名のAI社員を配置した、アイソメトリック型SES AI Office V3（静的フロント）",
};

export default function OfficeV3ClaudePage() {
  return <ClaudeOfficeV3 />;
}
