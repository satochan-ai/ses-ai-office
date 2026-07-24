import type { Metadata } from "next";
import IsometricOffice from "@/components/office-v2/IsometricOffice";

export const metadata: Metadata = {
  title: "Isometric AI Office V2 | SES AI Office",
  description: "11名のAI社員が一つのフロアで連携する、アイソメトリック型SES AI Officeプロトタイプ",
};

export default function OfficeV2Page() {
  return <IsometricOffice />;
}
