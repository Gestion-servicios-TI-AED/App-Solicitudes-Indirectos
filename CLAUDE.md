# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**App de Solicitudes de Indirectos — Baia Kristal**
Full-stack web app for managing indirect contracting requests. Located in `solicitudes-indirectos/`.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind CSS v4
- **Prisma 7** with `@prisma/adapter-pg` (driver adapter required — NOT classic `prisma-client-js`)
- **next-auth v4** (JWT sessions, credentials provider)
- Generated Prisma client at `src/generated/prisma` — import from `@/generated/prisma`

## Commands

```bash
cd solicitudes-indirectos

# Development
npm run dev              # Start dev server (http://localhost:3000)

# Database
npm run db:generate      # Generate Prisma client after schema changes
npm run db:push          # Push schema to DB (no migrations — for dev)
npm run db:migrate       # Create and apply migration
npm run db:seed          # Seed DB with users, projects, frentes
npm run db:studio        # Open Prisma Studio
npm run setup            # generate + push + seed (first time)

# Build & lint
npm run build
npm run lint
```

## Architecture

### Directory layout

```
src/
  app/
    (app)/              # Authenticated route group — wrapped by AppLayout
      page.tsx          # Dashboard
      solicitudes/      # List, detail, new, edit
      terceros/         # Third-parties + due diligence
      configuracion/    # Users, approvers, frentes (ADMIN only)
      perfil/           # User profile
    api/                # API routes (Route Handlers)
      auth/[...nextauth]/
      solicitudes/
      terceros/
      users/
      notificaciones/
      dashboard/stats/
      upload/
      config/aprobadores/
      frentes/
    login/              # Standalone auth page
  components/
    layout/             # AppLayout, Providers, NotificacionesBell
    ui/                 # Badge, Button, Card, Input, Modal, Select, Spinner, Textarea, Toaster
    forms/              # CronogramaBuilder
    solicitudes/        # SolicitudActions, SolicitudBadge, EstadoTimeline
  lib/
    prisma.ts           # Prisma singleton (uses PrismaPg adapter)
    auth.ts             # NextAuth config (authOptions)
    utils.ts            # cn(), formatCurrency, formatDate, numeroALetras, labels/colors maps
    holidays.ts         # Colombia business days + holiday calculation
    notifications.ts    # In-app notification helpers
  generated/prisma/     # Auto-generated — never edit manually
  types/
    next-auth.d.ts      # Session type augmentation
```

### Key patterns

**Prisma 7** requires a driver adapter — always instantiate with:
```typescript
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
new PrismaClient({ adapter });
```

**`$transaction` callbacks** — do NOT type `tx` as `typeof prisma`; let TypeScript infer it.

**Next.js 16 routes** — `params` is a Promise:
```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

**Auth in API routes**: `getServerSession(authOptions)` from `"next-auth"`.

**Client components** that need session: `useSession()` from `"next-auth/react"`.

### Roles and workflow

Roles: `SOLICITANTE` → `DIRECTOR_PROYECTO` → `CONTRATOS` → `CONTROLES` → `DIRECTOR_CONTROLES` → `ADMIN`

State machine (EstadoSolicitud):
`BORRADOR → ENVIADA → APROBADA_DIRECTOR → EN_TRAMITE_CONTRATOS → CREACION_MINUTA → ENVIO_CONTRATO_POLIZAS → EN_CONTROLES → APROBACION_FINAL → COMPLETADA`

State transitions handled in `src/app/api/solicitudes/[id]/estado/route.ts`.

### Business rules

- **Cronograma**: `fechaInicio` must be ≥ 13 business days from today (Colombia holidays via `src/lib/holidays.ts`)
- **Consecutivo**: format `SOL-{TIPO}-{YEAR}-{NNN}`, generated transactionally from `ContadorConsecutivo` table
- **Terceros**: only appear in solicitud dropdown when `aprobadoDebidaDiligencia = true` (all 6 DD checks set)
- **Timezone**: always `America/Bogota` (UTC-5)

### File uploads

Files saved to `public/uploads/` via `POST /api/upload`. Max 10MB. Allowed: `.pdf`, `.xlsx`, `.xls`.

### Document generation

- Word (`.docx`): `POST /api/solicitudes/[id]/documento` — uses `docx` npm package
- Excel cronograma: `POST /api/solicitudes/cronograma/export` — uses `exceljs`

## Environment variables

Required in `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solicitudes_indirectos
NEXTAUTH_SECRET=<random 32-char secret>
NEXTAUTH_URL=http://localhost:3000
```

## Seed credentials

All seeded users have password `Abc123!` except admin (`Admin123!`):
- `smercado@baiak.com` — SOLICITANTE
- `crodriguez@baiak.com` — DIRECTOR_PROYECTO (KALIZA)
- `vtorres@baiak.com` — DIRECTOR_PROYECTO (KALA)
- `amorales@baiak.com` — CONTRATOS
- `ljimenez@baiak.com` — CONTROLES
- `msuarez@baiak.com` — DIRECTOR_CONTROLES
- `admin@baiak.com` — ADMIN
