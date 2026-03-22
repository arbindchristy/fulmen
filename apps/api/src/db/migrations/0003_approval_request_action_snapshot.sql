ALTER TABLE approval_requests
ALTER COLUMN run_id DROP NOT NULL;

ALTER TABLE approval_requests
ALTER COLUMN policy_decision_id DROP NOT NULL;

ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS action_id TEXT NOT NULL DEFAULT '';

ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS action_title TEXT NOT NULL DEFAULT '';

ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS action_summary TEXT NOT NULL DEFAULT '';

ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT '';

ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS resource_ref TEXT NOT NULL DEFAULT '';

ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS action_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS policy_decision_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS risk_assessment_json JSONB NOT NULL DEFAULT '{}'::jsonb;
