import { OFFICE_V3_CLAUDE_DEMO_RESULT_STORAGE_KEY } from "@/data/officeV3ClaudeDemo";
import type {
  MatchingDemoResult,
  NewClientDemoResult,
  OfficeV3DemoResult,
  OfficeV3DemoResultBase,
} from "@/types/officeV3ClaudeDemo";

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

/** matching結果を、共通schemaに加えて検証する。 */
export function isMatchingDemoResult(value: unknown): value is MatchingDemoResult {
  if (!isOfficeV3DemoResultBase(value)) return false;
  const result = value as unknown as Record<string, unknown>;

  return result.scenarioId === "matching-proposal" &&
    isNonEmptyString(result.opportunityId) &&
    isNonEmptyString(result.opportunityTitle);
}

/** Step21-B: new-client結果を、共通schemaに加えて検証する。 */
export function isNewClientDemoResult(value: unknown): value is NewClientDemoResult {
  if (!isOfficeV3DemoResultBase(value)) return false;
  const result = value as unknown as Record<string, unknown>;

  return result.scenarioId === "new-client-outreach" &&
    isNonEmptyString(result.prospectId) &&
    isNonEmptyString(result.prospectName);
}

/**
 * Dashboard storage readerはscenario固有guardを直接知らず、この関数だけを使う。
 * Step21-Cで別シナリオを追加する場合は、ここに候補を1行足すだけでよい。
 */
export function isOfficeV3DemoResult(value: unknown): value is OfficeV3DemoResult {
  return isMatchingDemoResult(value) || isNewClientDemoResult(value);
}

/**
 * Step21-B: matching・new-clientの両結果を同時に保持できる保存container。
 * containerの`version: 1`と、各resultの`version: 2`は別概念（混同しないこと）。
 */
export type OfficeV3DemoResultStore = {
  version: 1;
  results: {
    matching?: MatchingDemoResult;
    newClient?: NewClientDemoResult;
  };
};

/** container schemaを検証する。存在するresultはそれぞれのguardをPASSしなければならない（部分的な無効値は全体rejectとする）。 */
export function isOfficeV3DemoResultStore(value: unknown): value is OfficeV3DemoResultStore {
  if (!value || typeof value !== "object") return false;
  const store = value as Record<string, unknown>;
  if (store.version !== 1) return false;
  if (!store.results || typeof store.results !== "object") return false;

  const results = store.results as Record<string, unknown>;
  if (results.matching !== undefined && !isMatchingDemoResult(results.matching)) return false;
  if (results.newClient !== undefined && !isNewClientDemoResult(results.newClient)) return false;
  return true;
}

/**
 * 新container形式・旧matching単体形式・不正値を、副作用なしでcontainer形式（またはnull）へ正規化する。
 * 旧形式を読んだ瞬間にstorageへ書き戻す強制migrationは行わない（次回結果保存時に新形式へ更新されればよい）。
 */
export function normalizeOfficeV3DemoResultStore(value: unknown): OfficeV3DemoResultStore | null {
  if (isOfficeV3DemoResultStore(value)) return value;
  if (isMatchingDemoResult(value)) return { version: 1, results: { matching: value } };
  return null;
}

/** sessionStorageからcontainerを読み、正規化して返す。読めない・壊れている場合はnull。 */
export function readOfficeV3DemoResultStore(): OfficeV3DemoResultStore | null {
  try {
    const raw = sessionStorage.getItem(OFFICE_V3_CLAUDE_DEMO_RESULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return normalizeOfficeV3DemoResultStore(parsed);
  } catch {
    return null;
  }
}

/** containerをそのままsessionStorageへ書き込む。 */
export function writeOfficeV3DemoResultStore(store: OfficeV3DemoResultStore): void {
  sessionStorage.setItem(OFFICE_V3_CLAUDE_DEMO_RESULT_STORAGE_KEY, JSON.stringify(store));
}
