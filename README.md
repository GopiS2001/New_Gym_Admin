# Premium Fitness — Admin Dashboard

React 19 + Vite + MUI (built on the Minimal UI kit components). Talks to the NestJS API in `../Backend`.

## Run

```bash
npm install            # or yarn
npm run dev            # http://localhost:8080
```

`.env` → `VITE_SERVER_URL=http://localhost:4100` (the API must be running).

Sign in with an admin account (seeded Super Admin: `admin@gym.local` / `Admin@12345` locally — change it under **My account**).

## Where things are

All gym-specific code lives in `src/gym/`:

| Path | What |
|---|---|
| `api.ts` | SWR hooks (`useApi`, `useList`, `useOptions`), mutations, upload/download, shared types |
| `permissions.tsx` | permission keys, `usePermissions`, `PermissionGuard` (route) and `Can` (inline) |
| `nav.tsx` / `routes.tsx` / `paths.ts` | permission-filtered sidebar, routes, URL helpers |
| `components/` | page shell, server-side DataGrid, reference/exercise pickers, media field + library dialog, phone-frame preview |
| `overview/` | KPI dashboard (live data, date/goal/status/segment filters) |
| `members/` | member list (filters, CSV export), detail (onboarding answers, workouts, programs, measurements, suspend/restore, reset link, JSON export) |
| `exercises/` | list, create/edit (instructions, muscles, alternatives, media, publish), member-facing preview |
| `programs/` | list, multi-week builder, preview |
| `content/` | coaches, workout templates, featured collections |
| `reference/` | one config-driven screen for goals, focus areas, categories, exercise types, equipment, groups, muscles, experience levels, onboarding options |
| `admin/` | media library, notifications, administrators & roles matrix, audit logs, my account |

Auth lives in `src/auth/context/jwt` (access + rotating refresh token, silent refresh in `src/lib/axios.ts`).

The template's demo pages remain in `src/sections` / `src/pages` as a component reference but are no longer routed.
