# NX QUALITY — CONFIGURACIÓN DE SUPABASE

## ESTADO ACTUAL

Proyecto: `sjecyepmeqvhraptovxo`
URL: `https://sjecyepmeqvhraptovxo.supabase.co`

## TABLAS CREADAS

### Foundation (2026-09-21)
- `users` — Usuarios del sistema con roles (SUPER_ADMIN, COMPANY_ADMIN, INSPECTOR)
- `companies` — Empresas asociadas
- `audit_logs` — Registro de auditoría

### Leads (2026-09-21)
- `leads` — Solicitudes de demostración desde la landing

## TABLA leads — DETALLE

```sql
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  company VARCHAR(255) NOT NULL,
  role VARCHAR(120) NOT NULL DEFAULT '',
  whatsapp VARCHAR(30) NOT NULL,
  fruit_type VARCHAR(120) NOT NULL DEFAULT '',
  company_type VARCHAR(50) NOT NULL DEFAULT '',
  recording_method VARCHAR(80) NOT NULL DEFAULT '',
  inspection_volume VARCHAR(50) NOT NULL DEFAULT '',
  problem TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS (actual)
RLS desactivado temporalmente para permitir inserción pública.

### Pendiente
Re-habilitar RLS con política:
- INSERT: público (anon)
- SELECT: solo SUPER_ADMIN autenticado

## CREDENCIALES

Las variables de entorno están configuradas en `apps/web/wrangler.jsonc`:

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Key anon (JWT)
- `SUPABASE_SERVICE_ROLE_KEY` — **NO configurada aún** (necesaria para GET /api/leads)

## MIGRACIONES

Las migraciones SQL están en:
`packages/database/supabase/migrations/`

- `20260811000001_foundation_initial_schema.sql` — users, companies, audit_logs
- `20260921000003_leads.sql` — leads

**IMPORTANTE:** Las migraciones se ejecutan manualmente en el SQL Editor de Supabase. No hay Supabase CLI vinculado.
