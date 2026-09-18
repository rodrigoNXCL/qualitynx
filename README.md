# QualityNX - Monorepo

Sistema de gestión de calidad y trazabilidad operacional para operaciones frutícolas.

## Arquitectura

```
qualitynx/
├── apps/
│   ├── web/          # Next.js + React (Administración/Supervisión)
│   └── mobile/       # React Native + Expo (Terreno/Inspectores)
├── packages/
│   ├── shared/       # Tipos compartidos, validaciones Zod
│   └── database/     # Cliente Supabase, migraciones, tipos DB
└── docs/             # Documentación del proyecto (CURRENT.md, BUILD_ORDER.md, etc.)
```

## Stack Tecnológico

- **Web**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Mobile**: React Native 0.86 + Expo 57 + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Offline Sync**: PowerSync (SQLite local)
- **Monorepo**: npm workspaces

## Requisitos Previos

- Node.js 20+
- npm 10+
- Supabase CLI (`npm install -g supabase`)
- Expo CLI (`npm install -g @expo/cli`)

## Instalación

```bash
# Instalar dependencias del monorepo
npm install

# Configurar variables de entorno
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# Editar .env.local y .env con tus credenciales de Supabase
```

## Desarrollo Local con Supabase

```bash
# Iniciar Supabase local
cd packages/database
supabase start

# Aplicar migraciones
supabase db reset

# Generar tipos TypeScript
npm run db:generate

# Abrir Supabase Studio
supabase studio
```

## Comandos Disponibles

```bash
# Desarrollo
npm run dev:web      # Iniciar Next.js (puerto 3000)
npm run dev:mobile   # Iniciar Expo (puerto 8081)

# Build
npm run build:web    # Build Next.js para producción
npm run build:mobile # Build Expo para producción

# Calidad de código
npm run lint         # ESLint en todos los workspaces
npm run typecheck    # TypeScript check en todos los workspaces

# Base de datos
npm run db:generate  # Generar tipos TypeScript desde Supabase
npm run db:push      # Push migraciones a Supabase
npm run db:studio    # Abrir Supabase Studio
npm run db:reset     # Reset base de datos local
npm run migration:new # Crear nueva migración
```

## Estructura de Base de Datos (FOUNDATION)

### Tablas Principales

- **companies** - Empresas clientes (multiempresa)
- **users** - Usuarios con rol y empresa
- **audit_logs** - Auditoría base de modificaciones

### Roles (01_FOUNDATION.md Sección 8)

- `SUPER_ADMIN` - Administración de plataforma
- `COMPANY_ADMIN` - Administración de empresa
- `INSPECTOR` - Inspector de terreno

### Seguridad

- **RLS (Row Level Security)** en todas las tablas operacionales
- Aislamiento estricto por empresa
- Auditoría automática via triggers

## Storage

Bucket `evidence` configurado para:
- Archivos privados (no públicos)
- Límite 50MB por archivo
- Tipos permitidos: JPEG, PNG, WebP, PDF, HEIC/HEIF
- Estructura: `evidence/{company_id}/{entity_type}/{entity_id}/`

## Documentación

Ver carpeta `docs/`:
- `CURRENT.md` - Fuente de verdad funcional
- `BUILD_ORDER.md` - Orden de construcción
- `BUILD_STATUS.md` - Estado actual
- `01_FOUNDATION.md` - Especificación etapa actual
- `IA_PROTOCOL.md` - Protocolo de trabajo para IA

## Estado Actual

**Etapa Activa**: 01 — FOUNDATION (EN DESARROLLO)

Ver `BUILD_STATUS.md` para checklist completo de Definition of Done.

## Licencia

Privado - QualityNX