-- Guest portal base schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS guest_checklist_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) NOT NULL,
  asset_type VARCHAR(60) NOT NULL,
  checklist_name VARCHAR(120) NOT NULL,
  require_supervisor_approval BOOLEAN DEFAULT TRUE,
  fields_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guest_assets_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) NOT NULL,
  fracttal_asset_id VARCHAR(40) NOT NULL,
  code VARCHAR(80),
  name VARCHAR(200) NOT NULL,
  asset_type VARCHAR(80),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, fracttal_asset_id)
);

CREATE TABLE IF NOT EXISTS guest_checklist_submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) NOT NULL,
  asset_id UUID NOT NULL REFERENCES guest_assets_catalog(id),
  template_id VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL,
  has_failure BOOLEAN DEFAULT FALSE,
  answers_json JSONB NOT NULL,
  reporter_name VARCHAR(120),
  reporter_email VARCHAR(150),
  supervisor_comment TEXT,
  fracttal_work_order_id VARCHAR(50),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
