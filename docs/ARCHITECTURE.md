# Architecture

## Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Storage / DB:** Supabase (Postgres + Storage, private bucket)
- **Hosting:** Vercel
- **PDF extraction:** `pdfjs-dist` (client-side); Tesseract.js OCR fallback
- **Spreadsheet:** `xlsx` (SheetJS) — all worksheets
- **DOCX export:** `docx` library; **PDF export:** `jsPDF`; **XLSX export:** SheetJS

## What Runs Without AI
All core logic — PDF parsing, initials extraction, phone-prefix conversion, exact/email-username/name-derived matching, duplicate detection — is deterministic rule-based code. Fuzzy suggestions use string-distance only. The app produces correct output with AI fully off.

## Key User Action: End-to-End Flow
1. User uploads files → stored in Supabase Storage (private, session-scoped path); metadata written to `sessions`.
2. Extraction runs client-side: pdfjs parses PDF text → timetable cell parser → `timetable_records` rows inserted.
3. SheetJS reads all worksheets → normaliser → `staff_records` rows inserted.
4. Matching engine runs: produces `match_records` with confidence + status.
5. Review screen reads `match_records` JOIN `timetable_records` JOIN `staff_records`; user edits written back immediately.
6. Preview renders from confirmed/manually-selected match_records.
7. Export generates file client-side; action written to `export_logs`.
8. Delete button calls Supabase Storage delete + soft-deletes all session rows.

## Layer Plan
1. **Data first:** all tables, seed rows, RLS policies.
2. **Engine:** parsers, normaliser, matching module — each in its own `/lib` file, unit-tested.
3. **Smart on top:** fuzzy suggest, OCR fallback, department-hint ranking — additive, never blocking.

## Now vs Later
**Now:** single-user, anonymous session, all processing client-side or edge function.
**Later:** auth + per-user RLS, server-side OCR for large PDFs, saved settings profiles, batch mode.
