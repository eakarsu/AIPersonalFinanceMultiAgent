BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'account_owner';

CREATE TABLE IF NOT EXISTS finance_cases (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_ref TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'intake' CHECK (stage IN ('intake','reconciled','calculated','advisor_review','approved','posted','reversed','corrected')),
  purpose TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  explanation TEXT,
  provider_receipt TEXT,
  correction_reference TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, case_ref),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS finance_inputs (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES finance_cases(id),
  source_system TEXT NOT NULL,
  record_ref TEXT NOT NULL,
  source_version TEXT NOT NULL,
  checksum TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(20,2),
  currency TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, source_system, record_ref, source_version)
);

CREATE TABLE IF NOT EXISTS finance_calculations (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES finance_cases(id),
  formula_version TEXT NOT NULL,
  input_digest TEXT NOT NULL,
  net_worth NUMERIC(20,2) NOT NULL,
  monthly_cashflow NUMERIC(20,2) NOT NULL,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, formula_version, input_digest)
);

CREATE TABLE IF NOT EXISTS finance_integration_deliveries (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  provider_receipt TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','failed','reconciled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider, idempotency_key)
);

CREATE TABLE IF NOT EXISTS finance_evaluations (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT REFERENCES finance_cases(id),
  dataset_version TEXT NOT NULL,
  scenario TEXT NOT NULL,
  expected JSONB NOT NULL,
  actual JSONB NOT NULL,
  within_bounds BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_workflow_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id BIGINT NOT NULL REFERENCES finance_cases(id),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_cases_tenant_stage ON finance_cases (tenant_id, stage, effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_inputs_case_effective ON finance_inputs (case_id, effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_deliveries_retry ON finance_integration_deliveries (status, next_attempt_at);

CREATE OR REPLACE FUNCTION reject_finance_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'finance_workflow_audit is append-only';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'finance_workflow_audit_append_only') THEN
    CREATE TRIGGER finance_workflow_audit_append_only
      BEFORE UPDATE OR DELETE ON finance_workflow_audit
      FOR EACH ROW EXECUTE FUNCTION reject_finance_audit_mutation();
  END IF;
END;
$$;

COMMIT;
