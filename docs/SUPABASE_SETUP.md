# NX QUALITY — CONFIGURACIÓN DE SUPABASE

## ESTADO ACTUAL

Proyecto: `sjecyepmeqvhraptovxo`
URL: `https://sjecyepmeqvhraptovxo.supabase.co`

## TABLAS CREADAS

### Foundation (2026-09-21)
- `users` — Usuarios del sistema con roles (SUPER_ADMIN, COMPANY_ADMIN, INSPECTOR)
- `companies` — Empresas asociadas
- `audit_logs` — Registro de auditoría

### Master Data (2026-09-22) — EJECUTADA
- `producers` — Productores por empresa
- `fields` — Campos por productor
- `blocks` — Cuarteles por campo
- `species` — Especies por empresa
- `varieties` — Variedades por especie
- `seasons` — Temporadas por empresa

Migración: `packages/database/supabase/migrations/20260922000001_master_data.sql`
Ejecutada y verificada en SQL Editor el 2026-09-22 (6 tablas accesibles, count=0).

### Master Data — Extensión productores (2026-09-22) — EJECUTADA
- `producers` + columnas: rut, address, comuna, city, gps_point, phone, email, contact_person, salida_producer_id

Migración: `packages/database/supabase/migrations/20260922000003_producers_extended_fields.sql`
Ejecutada por el usuario el 2026-09-22 sin errores; 9 columnas verificadas remotamente.

### LOTS (2026-09-22) — EJECUTADA
- `lots` — Lotes trazables (etapa 03)
- Enum `lot_status` — 10 estados (CURRENT §28)
- Identidad única: company + productor + variedad + fecha fruta + bloque de cosecha
- Triggers: terminalidad CERRADO (D-012), validación de referencias, auditoría, updated_at
- RLS por empresa; INSERT/UPDATE solo COMPANY_ADMIN/SUPER_ADMIN; sin DELETE

Migración: `packages/database/supabase/migrations/20260922000004_lots.sql`
Ejecutada por el usuario el 2026-09-22; 8/8 pruebas aprobadas.

### INSPECTIONS (2026-09-22) — EJECUTADA
- `inspection_points` — Puntos de evaluación configurables
- `measurement_defs` — Biblioteca de mediciones por punto
- `inspections` — Sobre lote; EN CURSO / COMPLETADA
- `samples`, `measurements`, `inspection_evidence`
- Enums `inspection_status`, `measurement_value_type`
- Triggers: cierre obliga mediciones + evidencia; COMPLETADA terminal; lote CERRADO no inspeccionable; auditoría
- RLS: SELECT empresa; INSERT/UPDATE COMPANY_ADMIN/SUPER_ADMIN/INSPECTOR

Migración: `packages/database/supabase/migrations/20260922000005_inspections.sql`
Ejecutada por el usuario el 2026-09-22 (confirmado: "el sql fue ejecutado con exito").

### D-015 + D-016 — ETAPAS Y PUNTOS (2026-09-22) — EJECUTADA
Cadena: EMPRESA → ESPECIE → ETAPA OPERACIONAL → PUNTO DE INSPECCIÓN → CRITERIOS

- `operational_stages` — 7 etapas globales (D-016), seed idempotente
- `inspection_points` + `species_id` + `operational_stage_id` (NOT NULL, backfill)
- Índice único: (company, species, stage, lower(name))
- Triggers: coherencia especie/etapa en punto; inspección exige especie de punto = especie de lote
- Seed puntos demo: 7 (1 por etapa) para especie ARÁNDANO
- Seed criterios: **17 SOLO en "Inspección Huerto"** (11 primarios + 4 complementarios + 2 configurables); otras etapas sin criterios
- Límites DEMO: Brix ≥ 10, Pudrición ≤ 2% (ejemplos 05 §18, NO estándar universal)
- `lots` + `entry_operational_stage_id` + `current_operational_stage_id` (sin backfill ficticio)
- `lot_stage_events` — INGRESO (único) / TRANSICION; sync etapa actual del lote; append-only
- `audit_logs.user_id` ahora NULLABLE (operaciones de sistema/SQL Editor sin sesión)

Migración: `packages/database/supabase/migrations/20260922000006_points_species_stages.sql`
**EJECUTADA** por el usuario el 2026-09-22 (Success — No rows returned). Verificado remoto: 7 etapas, 7 puntos, 17 criterios Huerto.

### D-020 + D-021 — INSPECCIONES MEJORA + IA (2026-09-22) — EJECUTADA
- `measurement_defs` + columnas: description, info_text, recommendation_text, method_text, source_kind, source_ref, validation_status, evidence_required, observation_required, sort_order, criteria_version, alert_only_out_of_range
- `measurement_value_type` extendido: temperatura, fecha, fecha-hora, multiselección, foto, archivo
- `inspection_evidence` + `measurement_def_id`
- `samples` + `method_text`, `instrument_text`
- `ai_inspection_analysis` — análisis IA por inspección (D-021)
- `ai_learning_records` — aprendizaje histórico estructurado (D-021)
- RLS por empresa + triggers audit/updated_at en tablas AI

Migración: `packages/database/supabase/migrations/20260922000007_inspection_ai.sql`
**EJECUTADA** por el usuario el 2026-09-22 (confirmado "ejecutado sin problemas"). Verificado remoto: columnas `measurement_defs` (info_text etc.), `samples.method_text`/`instrument_text`, tablas `ai_inspection_analysis`/`ai_learning_records` accesibles. E2E: 2 análisis + 2 learning records insertados y leídos por admin y service role.

### STORAGE evidence — políticas RLS (2026-09-22) — RESUELTO
- Bucket `evidence` creado vía Storage API (migración 000002 no llegó a aplicar el INSERT del bucket)
- SQL Editor falla con `42501: must be owner of table objects` sobre `storage.objects` (el rol `postgres` no es owner); RLS ya está habilitado por defecto
- **RESUELTO:** el usuario creó las 4 policies desde el Dashboard (Storage → evidence → Policies): `evidence_select_company`, `evidence_insert_company`, `evidence_update_own`, `evidence_delete_own`. Deficiones documentadas abajo (referencia histórica).
- E2E re-ejecutado: **30/30 PASS** — upload evidencia HTTP 200
- Migración idempotente de respaldo: `packages/database/supabase/migrations/20260922000008_evidence_storage_policies.sql` (ya no necesaria; preferible Dashboard si SQL da 42501)

Definiciones aplicadas (para referencia):

```sql
-- SELECT
bucket_id = 'evidence'
AND (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
      AND users.is_active = true
  )
  OR
  (storage.foldername(name))[1] = (
    SELECT company_id::text FROM users
    WHERE users.auth_id = auth.uid()
      AND users.is_active = true
  )
)

-- INSERT (WITH CHECK = mismo USING que SELECT)
-- igual al SELECT de arriba

-- UPDATE (USING y WITH CHECK)
bucket_id = 'evidence' AND owner = auth.uid()

-- DELETE (USING)
bucket_id = 'evidence' AND owner = auth.uid()
```

### QUALITY ENGINE (2026-09-22) — EJECUTADA
- Enums `quality_evaluation_result`, `quality_comparison_type`
- `measurement_defs` + `evaluation_kind`, `acceptable_options`
- `quality_evaluations` — append-only; `criterion_snapshot` JSONB; RLS SELECT/INSERT operadores; audit trigger
- Sin triggers de etapa/estado/decisión (QE no decide)

Migración: `packages/database/supabase/migrations/20260922000009_quality_engine.sql`
**EJECUTADA** por el usuario el 2026-09-22 (confirmada, sin errores). E2E quality: 22/22 PASS (regresión vigente posterior: 23/23).

### DECISIONS (2026-09-22) — EJECUTADA
- Enum `decision_status` — REGISTRADA / ANULADA
- `decision_catalog` — 10 tipos CURRENT §21 por empresa; `requires_fundamento` configurable
- `decisions` — append-only; `context_snapshot` JSONB; anulación (motivo/responsable/fecha); índice único tipo activo por lote; triggers: solo UPDATE→ANULADA, lote CERRADO bloquea INSERT, coherencia empresa catálogo/inspección
- `decision_effects` — mapa PUNTO+DECISIÓN→ESTADO/ETAPA **creada VACÍA** (PENDIENTE DE DECISIÓN, D-024)
- RLS: SELECT empresa; INSERT/UPDATE roles operadores; catálogo/efectos admin; audit + updated_at

Migración: `packages/database/supabase/migrations/20260922000010_decisions.sql`
**EJECUTADA** por el usuario el 2026-09-22 (confirmada, sin errores). E2E decisions: 12/12 PASS.

### TRACEABILITY — hardening inmutabilidad (2026-09-23) — PENDIENTE DE USUARIO
- Triggers de inmutabilidad sobre `audit_logs` / `lot_stage_events` / `quality_evaluations`
- RLS ya bloquea UPDATE/DELETE a clientes (verificado E2E 07); hardening defensivo adicional

Migración: `packages/database/supabase/migrations/20260923000001_traceability_history.sql`
**PREPARADA, NO EJECUTADA** — pendiente de SQL Editor del usuario (no bloquea DoD funcional).

### INSPECTION CONTINUITY + SAMPLING (2026-09-23) — EJECUTADA
- Columnas de continuidad en `inspections` (p.ej. `previous_inspection_id` y afines)
- Soporte de muestras / evidencia por muestra (`inspection_evidence.sample_id` u afines)
- Flujo: CONTINUAR INSPECCIÓN, destino de captura (Consolidado / M01…), recomendación, informe

Migración: `packages/database/supabase/migrations/20260923000002_inspection_continuity_sampling.sql`
**APLICADA** por el usuario el 2026-09-23 (columnas de continuidad verificadas).
E2E continuidad: **27/27 PASS**. Regresiones serie: 04 30/30, 05 23/23, 06 12/12, 07 18/18.
Nota: `database.types.ts` aún no regenerado para `inspection_evidence.sample_id` (select remoto sí lo devuelve; typecheck OK).

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
- `20260922000001_master_data.sql` — producers, fields, blocks, species, varieties, seasons (ejecutada 2026-09-22)
- `20260922000003_producers_extended_fields.sql` — columnas productores D-011 (ejecutada)
- `20260922000004_lots.sql` — lots + lot_status (ejecutada)
- `20260922000005_inspections.sql` — inspecciones/muestras/mediciones/evidencia (ejecutada)
- `20260922000006_points_species_stages.sql` — etapas/puntos/criterios/lots stages (ejecutada)
- `20260922000007_inspection_ai.sql` — mejora criterios + tablas AI (ejecutada)
- `20260922000008_evidence_storage_policies.sql` — políticas RLS bucket evidence (aplicadas via Dashboard; migración de respaldo idempotente)
- `20260922000009_quality_engine.sql` — quality_evaluations + enums (ejecutada)
- `20260922000010_decisions.sql` — decision_catalog + decisions + decision_effects (ejecutada)
- `20260923000001_traceability_history.sql` — triggers inmutabilidad audit/estados/QE (**pendiente de usuario**)
- `20260923000002_inspection_continuity_sampling.sql` — continuidad + muestras/evidencia (ejecutada 2026-09-23)
- `20260924000001_rls_users_company_select.sql` — RLS users/company select (**no** reportar como pendiente; ver NOTA en BUILD_STATUS)
- `20260924000002_sampling_unit_physical.sql` — unidad física de muestreo (**no** reportar como pendiente; ver NOTA en BUILD_STATUS)
- `20260924000003_quality_classifications.sql` — clasificación comercial + semáforo D-027 (aplicada 2026-09-24)
- `20260924000004_lot_type_genealogy.sql` — tipo de lote, folio interno, kg declarados y `lot_genealogy` D-029 (aplicada 2026-09-24)

**IMPORTANTE:** Las migraciones se ejecutan manualmente en el SQL Editor de Supabase. No hay Supabase CLI vinculado.
