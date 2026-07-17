# NUSH Parent Letter and Teacher Contact Generator

Internal tool for preparing parent-letter subject teacher contact tables from a class timetable PDF and the school staff directory workbook.

## Current Workflow

1. Upload a printed timetable PDF with selectable text.
2. Upload the staff directory Excel workbook.
3. Process the files.
4. Review highlighted rows and unresolved teacher codes.
5. Export the contact table as DOCX, PDF, XLSX, CSV, or copied HTML.

The app intentionally flags uncertain matches. It must not be used to invent teacher names, telephone numbers, or email addresses.

## Local Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

Apply migrations in order from `supabase/migrations/`.

Required migrations:

- `0001_init.sql` creates the app tables.
- `0002_security_hardening.sql` adds role-based RLS policies and private storage buckets.

Private buckets expected by the hardening migration:

- `timetable-imports`
- `staff-directory-imports`
- `generated-letters`

The original starter bucket `session-files` is not intended for production use.

## Authentication And Roles

Production should use invite-only Supabase Auth. Disable public sign-ups in Supabase and invite known users manually.

Roles are stored in `public.user_roles`:

- `admin`
- `teacher`

Bootstrap the first admin manually in Supabase SQL after inviting that user:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'ADMIN_EMAIL_HERE'
on conflict (user_id) do update set role = excluded.role;
```

Do not store authorisation decisions in `raw_user_metadata`.

## Environment Variables

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
INITIAL_ADMIN_EMAIL=
ALLOWED_EMAIL_DOMAIN=nus.edu.sg
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never be prefixed with `NEXT_PUBLIC_`.

The app also accepts the older `NEXT_PUBLIC_SUPABASE_ANON_KEY` name for compatibility, but new Vercel projects should use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Vercel Setup

1. Connect the GitHub repository to the Vercel project.
2. Add the required environment variables in Vercel Project Settings.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
4. Deploy from `main`.
5. After deployment, verify the latest build shows `Ready`.
6. Hard-refresh the production site before re-testing uploads.

## Staff Directory Import Notes

The importer reads all worksheets and supports side-by-side staff tables. It recognises staff email usernames such as `nhsfkm` and converts them to `nhsfkm@nus.edu.sg` for matching/export.

Imported spreadsheet values are sanitised during export to reduce XLSX/CSV formula-injection risk.

## Timetable Import Notes

Timetable PDFs must contain selectable text. If a timetable is only an image or screenshot, use browser print-to-PDF from the original timetable page so text is embedded.

The current parser includes a fallback for the class 101 printed layout and configured PE codes:

- `FKM`
- `AKSY`
- `DTYY`
- `DCKL`
- `KLKF`

Rows with uncertain or unmatched teacher codes must be reviewed manually.

## Verification

Before deployment:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

GitHub Actions runs the same checks on pushes and pull requests.

## Remaining Production Work

The current UI is still a single-page generator. The full admin/teacher portal described in the PRD requires additional pages for authentication, staff import review, timetable review, verified mappings, profiles, history, and template management.
