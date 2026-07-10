# Security

## Secret Handling
- Supabase service-role key never in frontend code; only anon key used client-side.
- All environment variables in `.env.local` / Vercel project settings; never committed.

## File Security
- Uploaded files stored in a **private** Supabase Storage bucket; no public URLs generated.
- Files accessed only via signed URLs with short expiry (15 min), server-side only.
- File-type validation: check MIME type + magic bytes, not just extension.
- File-size limits: PDF ≤ 20 MB, XLSX/CSV ≤ 10 MB, DOCX ≤ 5 MB.
- Filenames sanitised before storage (strip path traversal chars, spaces → underscores).

## Data Hygiene
- Staff contact data never written to application logs.
- Session data auto-expires after 24 hours (Supabase cron or Edge Function).
- CSV/XLSX exports: cell values prefixed with `'` if they start with `=`, `+`, `-`, `@` to block formula injection.
- Extracted text sanitised: HTML-encode before rendering in review screen.

## Permission Model (v1 → lock-down)
- **v1:** permissive RLS — demo works without login.
- **Lock-down sprint:** `auth.uid() = user_id` owner-scoped policies on all tables; Storage path enforces `userId/sessionId/` prefix.

## Approved Tools Rule
No `eval`, no `exec`, no dynamic SQL. All DB writes go through typed Supabase client calls with parameterised values.

## Audit Principle
Every export, every manual match correction, and every delete is written to `export_logs` or `match_records` before the action completes. If the write fails, the action does not proceed.
