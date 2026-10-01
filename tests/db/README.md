# PostgreSQL persistence contract tests

Test foundation only. The migration is **not applied to Production**. SQL helpers
are synthetic-fixture utilities, not a Production repository/codec or Server facade.
No runtime imports, HTTP, authentication, real routing or DB creation.

## Existing test database required

Use only an already provisioned, disposable PostgreSQL test database. Do not use
real/customer data. This change creates no database, account, project or Neon branch.
Required environment variables (configure credentials privately; never commit them):

- `TEST_DATABASE_URL`: dedicated PostgreSQL URL, never `DATABASE_URL` fallback.
- `TEST_DB_ALLOW_DDL`: exactly `test-only`.
- `TEST_DB_EXPECTED_DATABASE`: exact URL database name, which must be
  `ses_ai_office_test` or `ses_ai_office_test_<lowercase suffix>`.

For TLS use `sslmode=verify-full`; other URL options, fragments and duplicate query
parameters are refused. A name/opt-in guard cannot establish ownership by itself:
the operator must confirm this is an authorized disposable database first.
The role needs CONNECT and database CREATE (schemas), with ownership of its generated
schema. No role creation or permission changes are performed by the harness.

Run `npm run test:db`. Missing configuration fails before connecting or creating a
schema. `npm test` excludes live DB suites; guard/codec/Fake shared contracts still run.

## Isolation and cleanup

Each contract case owns a random `ses_ai_office_test_<32 hex>` schema. Client setup
checks `current_database()` and scoped `current_schema()` before operations.
Migration runs only in that schema. Cleanup ends owned clients, then drops **only
that same generated schema** after checking the database again. No TRUNCATE, database
DROP, public schema DROP, `IF NOT EXISTS`, or global pg type-parser changes.
Failure cleanup runs through hooks/setup catch. A killed process or lost connection
can leave its generated schema; report and investigate it rather than broad cleanup.

Per-case schemas support independent-connection races; one outer rollback cannot
isolate concurrent commits. Transactions explicitly use READ COMMITTED. Aggregate
command tests lock WorkItem first, then related rows/CAS. Fixture insertion and
standalone idempotency reservation tests are not aggregate business commands.
Independent clients and `pg_blocking_pids` prove blocking; bounded polling observes
the actual lock, not an arbitrary sleep. lock timeout 2s, statement timeout 8s,
query/idle transaction timeout 10s, test/hook timeout 15s prevent unbounded waits.

## Contract coverage and limits

Shared Fake/PostgreSQL cases: tenant same-ID isolation, CAS success/stale/missing,
transaction rollback. PostgreSQL-specific cases: JSONB roundtrip/projection checks,
local safe bigint decode, composite FKs/current Approval aggregate FK, pending-only
decisions/history, immutable Evidence replay/collision, idempotency reserve/existing/
mismatch/conditional completion/replay, commit and rollback key races, uncommitted
visibility, root-lock timeout, Approve/Reject same-revision race, Audit insert/duplicate,
aggregate rollback, CHECK failures and explicit migration reapplication failure.
Approve/Reject race tests persistence scheduling, not an HTTP or Domain end-to-end flow.

Audit/Evidence application-role UPDATE/DELETE denial is **deferred**: no role setup is
introduced. SQL helpers expose insert-only Evidence/Audit operations; a schema owner
can still update/delete through arbitrary SQL. This is not DB-enforced immutability.
Existing IDs have nonempty text checks in transport but no general maximum-length
contract for tenant/ID/key/command/request. Keep opaque text for now; define byte
limits before a Production Adapter (PostgreSQL index size can reject oversized keys).
WorkItem `approvalRequired` is currently literal `true`. Deliverable version has no
integer-only Domain contract; numeric plus finite validation preserves that boundary.
ISO synthetic timestamps replace Fake-only values such as `later` without changing
existing Fake tests. WorkItem DB metadata timestamps are separate from entity timestamps.

Standard SQL/pg is shared across local PostgreSQL, Neon and RDS; no provider SDK.
No live DB was available during implementation. DDL execution, FK/CHECK enforcement,
locks, races and DB rollback are **unverified until `test:db` passes on an authorized
test database**. Unit/build/type/lint success cannot substitute for that evidence.
