-- 未Production適用draft。専用test schemaのsearch_path上でのみ検証する。
BEGIN;
CREATE TABLE work_items (
 tenant_id text COLLATE "C" NOT NULL, id text COLLATE "C" NOT NULL,
 revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
 schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version=1),
 kind text NOT NULL CHECK (kind IN ('opportunity_proposal','matching-proposal','new-client-outreach','candidate-screening','bp-alliance','engineer-follow')),
 mode text NOT NULL CHECK (mode IN ('demo','real')),
 status text NOT NULL CHECK (status IN ('intake_received','structuring','candidate_search','condition_match','info_gap_check','draft_generation','quality_check','awaiting_approval','preparation_recorded','closed','blocked_missing_info','blocked_no_candidate','blocked_conflict','needs_human_input','returned_for_rework','approval_expired','approval_invalidated','failed_intake','failed_execution','cancelled','superseded')),
 assigned_agent_id text COLLATE "C", assigned_human_id text COLLATE "C", current_approval_id text COLLATE "C",
 approval_required boolean NOT NULL CHECK (approval_required), due_at timestamptz, archived_at timestamptz,
 entity jsonb NOT NULL,
 -- DB保存metadata。Domain createdAt/updatedAtはentity内が正本。
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT work_items_pk PRIMARY KEY (tenant_id,id),
 CHECK ((jsonb_typeof(entity)='object' AND entity->>'id'=id AND entity->>'kind'=kind AND entity->>'mode'=mode AND entity->>'status'=status AND entity->'schemaVersion'=to_jsonb(schema_version) AND entity->'approvalRequired'=to_jsonb(approval_required)) IS TRUE)
);
CREATE TABLE approvals (
 tenant_id text COLLATE "C" NOT NULL, id text COLLATE "C" NOT NULL, work_item_id text COLLATE "C" NOT NULL,
 schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version=1),
 state text NOT NULL CHECK (state IN ('pending','approved','rejected','on_hold','expired','invalidated','withdrawn')),
 approver_type text, approver_id text COLLATE "C", requested_by_type text NOT NULL CHECK (requested_by_type IN ('agent','human','system')), requested_by_id text COLLATE "C" NOT NULL,
 decided_by_type text, decided_by_id text COLLATE "C", requested_at timestamptz NOT NULL, decided_at timestamptz,
 scope jsonb NOT NULL, decision_comment text, rejection_reason text, expires_at timestamptz NOT NULL,
 invalidated_at timestamptz, invalidation_reason text, supersedes_approval_id text COLLATE "C",
 deliverable_id text COLLATE "C" NOT NULL,
 -- number型に整数制約はない。codecでfinite確認、DBも非有限値拒否。
 deliverable_version numeric NOT NULL CHECK (deliverable_version NOT IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)),
 deliverable_hash text NOT NULL, proposal_snapshot_hash text NOT NULL, entity jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT approvals_pk PRIMARY KEY (tenant_id,id),
 CONSTRAINT approvals_aggregate_id_uq UNIQUE (tenant_id,work_item_id,id),
 FOREIGN KEY (tenant_id,work_item_id) REFERENCES work_items (tenant_id,id),
 FOREIGN KEY (tenant_id,work_item_id,supersedes_approval_id) REFERENCES approvals (tenant_id,work_item_id,id),
 CHECK (supersedes_approval_id IS NULL OR supersedes_approval_id<>id),
 CHECK ((approver_type IS NULL AND approver_id IS NULL) OR (approver_type IS NOT NULL AND approver_id IS NOT NULL AND approver_type IN ('agent','human','system'))),
 CHECK ((decided_by_type IS NULL AND decided_by_id IS NULL AND decided_at IS NULL) OR (decided_by_type IS NOT NULL AND decided_by_id IS NOT NULL AND decided_at IS NOT NULL AND decided_by_type IN ('agent','human','system'))),
 CHECK (state<>'pending' OR (decided_at IS NULL AND invalidated_at IS NULL)),
 CHECK (state NOT IN ('approved','rejected') OR (decided_at IS NOT NULL AND decided_by_type IS NOT NULL AND decided_by_type='human' AND approver_type IS NOT NULL AND approver_type='human' AND approver_id IS NOT NULL AND approver_id=decided_by_id)),
 CHECK (state<>'rejected' OR (rejection_reason IS NOT NULL AND length(btrim(rejection_reason))>0)),
 CHECK (state<>'approved' OR rejection_reason IS NULL),
 CHECK (state<>'invalidated' OR invalidated_at IS NOT NULL),
 CHECK ((jsonb_typeof(scope)='object' AND scope->'permits'='["prepare-only"]'::jsonb) IS TRUE),
 CHECK ((jsonb_typeof(entity)='object' AND entity->>'id'=id AND entity->>'workItemId'=work_item_id AND entity->>'state'=state) IS TRUE)
);
ALTER TABLE work_items ADD CONSTRAINT work_items_current_approval_fk FOREIGN KEY (tenant_id,id,current_approval_id) REFERENCES approvals (tenant_id,work_item_id,id) DEFERRABLE INITIALLY IMMEDIATE;
CREATE TABLE evidence (
 tenant_id text COLLATE "C" NOT NULL, id text COLLATE "C" NOT NULL, work_item_id text COLLATE "C" NOT NULL,
 schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version=1),
 kind text NOT NULL CHECK (kind IN ('source_excerpt','person_statement','system_record','agent_inference','human_confirmation')),
 claim text NOT NULL, source_ref text NOT NULL, source_version text NOT NULL, excerpt text NOT NULL,
 produced_by_type text NOT NULL CHECK (produced_by_type IN ('agent','human','system')), produced_by_id text COLLATE "C" NOT NULL,
 produced_at timestamptz NOT NULL, observed_at timestamptz, verified_at timestamptz, valid_until timestamptz,
 entity jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT evidence_pk PRIMARY KEY (tenant_id,id), FOREIGN KEY (tenant_id,work_item_id) REFERENCES work_items (tenant_id,id),
 CHECK ((jsonb_typeof(entity)='object' AND entity->>'id'=id AND entity->>'workItemId'=work_item_id AND entity->>'kind'=kind) IS TRUE)
);
-- excerpt: access restriction/retention/field encryptionは将来別工程。
CREATE TABLE idempotency (
 tenant_id text COLLATE "C" NOT NULL, actor_id text COLLATE "C" NOT NULL, idempotency_key text COLLATE "C" NOT NULL,
 command_id text COLLATE "C" NOT NULL, work_item_id text COLLATE "C", fingerprint text COLLATE "C" NOT NULL,
 status text NOT NULL CHECK (status IN ('processing','succeeded','rejected')), safe_result jsonb,
 created_at timestamptz NOT NULL, completed_at timestamptz, expires_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT idempotency_pk PRIMARY KEY (tenant_id,actor_id,idempotency_key),
 FOREIGN KEY (tenant_id,work_item_id) REFERENCES work_items (tenant_id,id),
 CHECK (expires_at>=created_at), CHECK (completed_at IS NULL OR completed_at>=created_at),
 CHECK (((status='processing' AND completed_at IS NULL AND safe_result IS NULL)
 OR (status='succeeded' AND completed_at IS NOT NULL AND work_item_id IS NOT NULL AND jsonb_typeof(safe_result)='object' AND safe_result->>'commandId'=command_id AND safe_result->>'workItemId'=work_item_id AND safe_result->>'outcome'='succeeded' AND safe_result-ARRAY['commandId','workItemId','outcome']::text[]='{}'::jsonb)
 OR (status='rejected' AND completed_at IS NOT NULL AND jsonb_typeof(safe_result)='object' AND safe_result->>'code' IN ('conflict','invalid_state') AND (NOT (safe_result?'subcode') OR safe_result->>'subcode' IN ('stale_revision','idempotency_mismatch')) AND safe_result-ARRAY['code','subcode']::text[]='{}'::jsonb)) IS TRUE)
);
CREATE TABLE audit (
 tenant_id text COLLATE "C" NOT NULL, audit_id text COLLATE "C" NOT NULL, command_id text COLLATE "C" NOT NULL,
 request_id text COLLATE "C" NOT NULL, idempotency_key text COLLATE "C" NOT NULL, work_item_id text COLLATE "C" NOT NULL,
 actor_id text COLLATE "C" NOT NULL, actor_type text NOT NULL CHECK (actor_type='human'),
 command_type text NOT NULL CHECK (command_type IN ('approve-work-item','reject-work-item','return-for-rework','provide-missing-info')),
 received_at timestamptz NOT NULL, completed_at timestamptz NOT NULL, outcome text NOT NULL,
 reason_reference text, before_revision bigint, after_revision bigint, safe_error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT audit_pk PRIMARY KEY (tenant_id,audit_id),
 CHECK (before_revision IS NULL OR before_revision BETWEEN 1 AND 9007199254740991),
 CHECK (after_revision IS NULL OR after_revision BETWEEN 1 AND 9007199254740991),
 CHECK (before_revision IS NULL OR after_revision IS NULL OR after_revision>=before_revision),
 CHECK (completed_at>=received_at),
 CHECK (safe_error_code IS NULL OR safe_error_code IN ('unauthenticated','not_found','forbidden','validation_error','conflict','invalid_state','repository_error','transaction_error')),
 CHECK ((outcome='succeeded' AND after_revision IS NOT NULL AND safe_error_code IS NULL) OR (outcome='rejected' AND after_revision IS NULL AND safe_error_code IS NOT NULL))
);
-- Auditはnot_found拒否の履歴にも備えsoft reference。機密payload欄なし。
-- Application role: Audit/Evidence INSERT,SELECTのみ。権限setupは別管理。
CREATE INDEX work_items_active_status_idx ON work_items (tenant_id,status,id) WHERE archived_at IS NULL;
CREATE INDEX evidence_work_item_idx ON evidence (tenant_id,work_item_id,id);
CREATE INDEX idempotency_expiry_idx ON idempotency (expires_at);
CREATE INDEX audit_work_item_time_idx ON audit (tenant_id,work_item_id,created_at,audit_id);
COMMIT;
