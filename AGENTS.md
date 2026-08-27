# AI-Office Project Instructions

## Product Responsibility

AI-Office is a front-end MVP/demo that visualizes SES sales, recruiting, BP development, project-to-talent matching, engineer follow-up, KPI views, and coordinated work by fictional “AI employees.” It does not replace the specialized MatchPilot Dashboard, CRM, AI Matching, MatchHire, or MatchFollow projects, and their functionality must not be assumed to be integrated here.

## AI and Demo Boundary

The current implementation uses mock data, fixed responses, timers, React state, and scenario simulation. No OpenAI, Claude, Gemini, LLM API, tools/function calling, RAG, embeddings, vector database, or autonomous external action should be assumed. `office-v3-claude` and `office-v3-codex` identify UI implementation lines, not runtime API providers.

AI employees are UI personas and task representations. A displayed status, recommendation, handoff, activity log, or “指示を実行” action is not evidence of real AI judgment, external communication, background execution, persistent memory, or completed business work.

## Office Versions and Routes

Keep the Office generations separate. Current routes include `/`, `/dashboard`, `/office-v2`, `/office-v3-claude`, and `/office-v3-codex`, with corresponding components, data, layouts, and types. Do not infer which version is production, legacy, or default merely from its route or filename.

`office-v3-codex` is uncommitted WIP. Protect these paths and do not complete, delete, format, refactor, merge with V3 Claude, promote to the default route, or treat as production without explicit instruction:

- `app/office-v3-codex/`
- `components/office-v3-codex/`
- `data/officeV3CodexLayout.ts`
- `types/officeV3Codex.ts`

When changing an Office version, limit the change to the requested generation and verify its route, layout, data, types, components, interactions, and responsive behavior.

## Mock Data and State

Treat `data/office.ts`, `data/mockData.ts`, `data/demoScenario.ts`, route/layout data, and V3 data as mock or fixed demo sources unless current code proves otherwise. KPI, task, progress, notification, activity, customer, BP, project, engineer, candidate, matching, and recommendation values may be mock, derived, scenario-derived, or fixed adjustments; confirm which before changing their meaning.

Demo results use `sessionStorage` for temporary browser state. `localStorage` is used for UI state such as onboarding. Neither is a database, secure storage, authentication system, or durable business record. Preserve keys and structures when changing state, and do not store secrets or real operational data.

For scenario changes, check start, transitions, timers, pause, resume, stop, rerun, handoff, result, and Dashboard reflection together. A simulated handoff is not multi-agent orchestration or an external workflow.

## Dashboard and Product Boundaries

Preserve the distinction between mock KPI/activity and real business metrics. Do not add or imply API links to other MatchPilot projects, CRM writes, recruiting decisions, matching decisions, or follow-up actions without an explicit integration and security design.

Buttons, links, and panels may be demonstrations. Do not infer that email, calendar, Slack, database, CRM, file, or external API writes occur. Do not activate nonexistent routes or production URLs by guesswork.

## Privacy and Confidential Data

Names, customers, BP companies, projects, candidates, engineers, recruiting data, KPI, contracts, tasks, meeting content, email content, and internal notes may become confidential even when current examples are mock data. Never copy real employee, customer, project, candidate, contract, financial, meeting, or business data into mock data, fixtures, screenshots, logs, or documentation.

Do not publish API keys, environment values, database URLs, production URLs, or credentials. Do not expose inferred personal or business information merely because an AI employee persona or recommendation is displayed.

## Authentication Boundary

The current front-end MVP does not establish production login, session authentication, middleware, server-side authorization, role-based access control, or internal-only security. Do not describe the application as authenticated or secure based on its office-style UI. Connecting real data requires separate authentication, authorization, privacy, and audit review.

## UI and Design Semantics

Do not apply one generation’s design system indiscriminately to another. Preserve each version’s layout, furniture, characters, cards, spacing, interactions, panels, and responsive behavior. Keep AI employee names, roles, appearance, assignments, and scenario references consistent across the relevant data, types, layouts, and components.

Do not change KPI, progress, task, status, notification, handoff, or recommendation meaning for visual reasons. Check desktop, tablet, mobile, sidebar/canvas overflow, modal/detail panels, keyboard access, labels, headings, and contrast where applicable.

## Documentation and Validation

README and docs may describe future architecture or portfolio/demo behavior. Treat future real AI, CRM/MatchHire/MatchFollow integration, external actions, persistent DB, authentication, and production deployment as proposals until verified in code. If docs and implementation differ, inspect current code and report the discrepancy rather than silently broadening scope.

For changes, validate the target Office version and route, WIP impact, AI/mock boundary, scenario transitions, Dashboard/KPI source, state-storage compatibility, privacy exposure, and responsive behavior. Use available `lint` or `build` scripts when appropriate; do not assume tests exist or report checks that were not run.

## Scope and Completion

Make the smallest project-specific change. Do not alter the protected V3 Codex WIP or unrelated Office generations. Common safety, Git, secret, change-scope, and reporting rules come from the global AGENTS.md.

At completion, report the affected Office version, route, WIP, scenario, KPI, state, privacy, authentication, external-action, integration, and responsive boundaries, plus validation results and any commit, push, or deploy actions actually performed.
