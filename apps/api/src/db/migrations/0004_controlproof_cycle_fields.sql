ALTER TABLE change_requests
ADD COLUMN IF NOT EXISTS control_family TEXT NOT NULL DEFAULT '';

ALTER TABLE change_requests
ADD COLUMN IF NOT EXISTS framework TEXT NOT NULL DEFAULT '';

ALTER TABLE change_requests
ADD COLUMN IF NOT EXISTS business_owner TEXT NOT NULL DEFAULT '';

ALTER TABLE change_requests
ADD COLUMN IF NOT EXISTS source_systems_json JSONB NOT NULL DEFAULT '[]'::jsonb;
