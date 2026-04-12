# PhotoDoc Web Admin — Project Context

## What This Is

A cloud-based photo documentation and communication web app for contractors — competing with CompanyCam. Contractors capture, organize, and share job site progress in real-time. This repo is the **web admin dashboard** deployed on **Vercel**.

### System Architecture

| Layer | Tech | Location |
|-------|------|----------|
| Web admin | Next.js 15 + React 19 + Tailwind 4 | This repo (`nextjs-supabase-admin`) |
| Mobile app | PWA + Capacitor (iOS) | `src/app/m/` in this repo |
| Backend/DB | Supabase (Postgres + Auth + Storage) | `dkgcfmbbhhryrbchzcch.supabase.co` |
| Hosting | Vercel | — |

## Tech Stack

- **Framework:** Next.js 15.5.5 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS v4
- **Database/Auth:** Supabase (`@supabase/supabase-js` + `@supabase/auth-helpers-nextjs`)
- **Language:** TypeScript 5 (strict mode)
- **Path alias:** `@/*` → `./src/*`

## Project Structure

```
src/
├── app/
│   ├── admin/                  # Protected admin routes
│   │   ├── layout.tsx          # Sidebar + account menu layout
│   │   ├── types.ts            # Shared types (PhotoRecord, ProjectRecord, ProfileRow, etc.)
│   │   ├── components/         # Sidebar nav, account menu
│   │   ├── projects/           # CRUD for projects, albums, checklists, documents, labels
│   │   ├── photos/             # Photo browsing/filtering
│   │   ├── users/              # User management + invite wizard
│   │   ├── groups/             # Group management
│   │   ├── checklists/         # Checklist CRUD
│   │   ├── reports/            # Report CRUD + PDF generation
│   │   ├── templates/          # Checklist/label/page templates
│   │   ├── settings/           # User profile + notification settings
│   │   ├── payments/           # (placeholder)
│   │   ├── map/                # (placeholder)
│   │   ├── reviews/            # (placeholder)
│   │   ├── portfolio/          # (placeholder)
│   │   └── integrations/       # (placeholder)
│   ├── api/
│   │   ├── auth/               # login, logout
│   │   └── admin/              # users, projects, groups, reports, photos, profile, notifications
│   └── login/                  # Public login page
├── lib/
│   └── supabase.ts             # Supabase client (anon + service role)
middleware.ts                    # Auth guard for /admin/* routes
```

## Supabase Schema (22 tables)

### Core
- `organizations` — id, name, created_at (root tenant entity)
- `profiles` — user_id (PK), org_id (FK), first_name, last_name, role (org_role enum), is_admin, is_active, created_at
- `projects` — id, name, org_id (FK), created_by (FK→profiles), created_at
- `project_members` — project_id+user_id (composite PK), role (project_role enum, default: viewer)
- `project_labels` — project_id+label_id (composite PK)
- `project_documents` — id, name, object_key, org_id, project_id, created_by, created_at

### Photos & Media
- `photos` — id, object_key, url, name, notes, tags, lat, lon, status (enum), upload_status (enum), org_id, project_id, created_by, created_at
- `photo_labels` — photo_id+label_id (composite PK)
- `labels` — id, name, color, org_id, created_at
- `albums` — id, name, description, org_id, project_id, created_by, created_at
- `album_items` — album_id+photo_id (composite PK), sort_order

### Checklists
- `checklists` — id, name, org_id, project_id, template_id (FK→checklist_templates), created_by, created_at
- `checklist_items` — id, checklist_id, label, sort_order, state (checklist_item_state: todo/doing/done/n-a), updated_by, updated_at
- `checklist_templates` — id, name, description, org_id, created_by, created_at
- `checklist_template_items` — id, template_id, label, sort_order

### Reports
- `reports` — id, title, status (report_status: draft/published), pdf_object_key, org_id, project_id, created_by, created_at, published_at
- `report_items` — report_id+photo_id (composite PK), caption, sort_order

### Tasks
- `tasks` — id, title, description, status (task_status: unfinished/...), due_at, assignee_id, org_id, project_id, created_by, created_at, updated_at

### Notifications
- `notification_settings` — user_id (PK), org_id, email_enabled, email_digest (digest_frequency), push_enabled, quiet_start, quiet_end
- `notification_prefs` — user_id+event+channel (composite PK), org_id, enabled
- `push_devices` — id, user_id, org_id, push_token, platform, device_id, last_seen

### Views
- `_v_me` — uid, org_id, is_admin (convenience view for current user)

### Enums
org_role, project_role, status, upload_status, checklist_item_state, report_status, task_status, notification_event, notification_channel, digest_frequency

**Storage bucket:** `photos` (signed URLs, 60-hour expiry)

## Auth & Roles

- Email/password auth via Supabase
- Middleware protects all `/admin/*` routes → redirects to `/login`
- Roles: `admin`, `manager`, `standard`, `restricted`
- Multi-tenant: all queries scoped by `org_id`
- RLS enforced on all tables

## Key Patterns

- Server components fetch data directly from Supabase; client components use API routes
- `createServerComponentClient` for server pages, `createRouteHandlerClient` for API routes, `createMiddlewareClient` for middleware
- Service role client for admin-only operations (e.g., bulk user invites)
- Images served via Supabase signed URLs with Next.js image optimization

## Environment Variables (.env.local)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Commands

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
```
