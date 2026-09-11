import type { MatchingDemoResult, OfficeV3DemoResultBase } from "@/types/officeV3ClaudeDemo";

const BASE_STRING_FIELDS = [
  "scenarioId",
  "scenarioTitle",
  "completedAt",
  "finalAgentId",
  "finalAgentName",
  "resultTitle",
  "resultSummary",
] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** V3 Dashboard連携結果の共通v2 schemaを検証する。 */
export function isOfficeV3DemoResultBase(value: unknown): value is OfficeV3DemoResultBase {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;

  return result.version === 2 &&
    result.source === "office-v3-claude" &&
    result.mock === true &&
    BASE_STRING_FIELDS.every(key => isNonEmptyString(result[key]));
}

/** 現在Dashboard連携するmatching結果を、共通schemaに加えて検証する。 */
export function isMatchingDemoResult(value: unknown): value is MatchingDemoResult {
  if (!isOfficeV3DemoResultBase(value)) return false;
  const result = value as unknown as Record<string, unknown>;

  return result.scenarioId === "matching-proposal" &&
    isNonEmptyString(result.opportunityId) &&
    isNonEmptyString(result.opportunityTitle);
}
