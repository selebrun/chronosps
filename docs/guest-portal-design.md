# Add-on Portal Externo de Solicitudes y Checklists

## Objetivo
Implementar un módulo independiente estilo Fracttal Guest Portal, con login propio, administración de usuarios, formulario configurable por cliente, checklists por activo rodante, flujo de aprobación y creación opcional de solicitud de trabajo en Fracttal.

## Alcance MVP implementado
- Rutas web base:
  - `/guest-portal/login`
  - `/guest-portal/report`
  - `/guest-portal/admin`
- APIs:
  - `GET/POST /api/guest-portal/templates`
  - `GET /api/guest-portal/assets`
  - `GET/POST /api/guest-portal/submissions`
  - `POST /api/guest-portal/sync-assets`
  - `POST /api/guest-portal/approve`
- Sincronización de activos desde Odoo/Fracttal (modelo `asset.asset`).
- Registro de checklists y aprobación previa para bloquear acciones hasta supervisor.
- Generación de solicitud en Fracttal (`maintenance.request`) cuando se aprueba y hay falla.

## Modelo de datos sugerido
```sql
CREATE TABLE guest_portal_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('guest_admin', 'supervisor', 'operator')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE guest_checklist_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) NOT NULL,
  asset_type VARCHAR(60) NOT NULL,
  checklist_name VARCHAR(120) NOT NULL,
  require_supervisor_approval BOOLEAN DEFAULT TRUE,
  fields_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE guest_assets_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) NOT NULL,
  fracttal_asset_id VARCHAR(40) NOT NULL,
  code VARCHAR(80),
  name VARCHAR(200) NOT NULL,
  asset_type VARCHAR(80),
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(company_id, fracttal_asset_id)
);

CREATE TABLE guest_checklist_submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) NOT NULL,
  asset_id UUID NOT NULL REFERENCES guest_assets_catalog(id),
  template_id UUID NOT NULL REFERENCES guest_checklist_template(id),
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
```
