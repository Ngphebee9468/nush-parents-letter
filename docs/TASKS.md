# Tasks

## Sprint 1 — Data foundation + upload UI
**Goal:** Anonymous visitor sees the app with demo data; can upload files; metadata persists.

- [ ] Run migration SQL: create all 5 tables, seed demo rows, enable RLS v1 policies
- [ ] Scaffold Next.js 14 + TypeScript + Tailwind project; connect Supabase client
- [ ] Create private Supabase Storage bucket `session-files`
- [ ] Build `/` upload page: three drag-and-drop zones (timetable, directory, letter template)
- [ ] File-type + size validation client-side and on upload
- [ ] On submit: create `sessions` row; upload files to `sessionId/` path; show success state
- [ ] Stage progress bar component (Upload → Extract → Match → Review → Export)
- [ ] Demo mode button: load seed session without uploading files
- [ ] All five UI states: loading, empty, partial (one file), error (wrong type), ready (all files)

**Definition of Done:** Anonymous user opens `/`, sees demo class 602 data, uploads a PDF + XLSX, sees session row in Supabase with correct file names, no errors.

---

## Sprint 2 — Extraction engine (timetable + directory) ✦ v1 core
**Goal:** Uploaded files produce populated timetable_records and staff_records.

- [ ] `/lib/extractTimetable.ts`: pdfjs text layer → cell splitter → exclusion filter (rooms, times, venues, keywords)
- [ ] `/lib/ocr.ts`: Tesseract.js fallback when no text layer detected; confidence score per page
- [ ] `/lib/parseDirectory.ts`: SheetJS reads all worksheets; fuzzy column-header detection
- [ ] `/lib/normalise.ts`: initials uppercase + strip punctuation; phone prefix rules (6516/6601); email cleanup; 4-digit ambiguous flag
- [ ] Write extracted rows to `timetable_records` and `staff_records` via Supabase
- [ ] Extract page: show count of records found, warn on zero initials or unrecognised headers
- [ ] Unit tests: all 8 mandatory phone test cases; initials normalisation cases
- [ ] Error states: no text detected, OCR required notice, unrecognised headers, corrupted file, password-protected file

**Definition of Done:** Sample PDF + XLSX from demo produce correct timetable_records and staff_records; `68533 → 6516 8533`, `11804 → 6601 1804` pass; `LCS` and `NOH` appear normalised.

**← v1 functional milestone reached at end of Sprint 4**

---

## Sprint 3 — Matching engine
**Goal:** Every timetable_record has a match_record with correct status and confidence.

- [ ] `/lib/matching.ts`: Priority 1–5 matching logic (exact → email-username → name-derived → dept-hint → fuzzy suggest)
- [ ] Single-letter code rule: cap confidence ≤ 0.50 unless sole directory match
- [ ] Write `match_records`; set `status` correctly for each case
- [ ] Never auto-confirm fuzzy or multi-match
- [ ] Unit tests: LCS/nhslcs → confirmed exact, confidence 1.0; `D` → ambiguous; missing ext → blank + warning; multi-match → `multiple_possible`
- [ ] Match page: show summary counts by status; spinner during processing

**Definition of Done:** LCS test case: status `confirmed_exact`, Tel `6516 8533`, match_method `exact_initials`. `D` test case: status `multiple_possible`, no staff_record_id auto-assigned.

---

## Sprint 4 — Review screen ✦ v1 functional milestone
**Goal:** User can resolve all uncertain matches; corrections persist; no silent auto-accept.

- [ ] Review table: Include checkbox, Subject, Teacher initials, Matched name, Tel, Email, Status badge, Confidence %, Notes, Edit button
- [ ] Highlight rows where confidence < threshold (default 0.90) in amber; `no_match` in red
- [ ] Uncertain rows: dropdown search of all staff_records; manual name/tel/email entry form
- [ ] On staff selection: auto-populate tel and email from staff_records
- [ ] Allow: exclude row, correct initials, merge duplicates, split combined initials
- [ ] Subject rename UI: show suggested conversions (Bio 6 → Biology etc.); user approves each
- [ ] All corrections write to match_records immediately (no unsaved state); confirm on page refresh
- [ ] Settings panel (expandable): year, semester, class, domain, prefixes, subject-name map, confidence threshold, inclusion toggles
- [ ] Five UI states per row: loading, unreviewed, confirmed, corrected, excluded

**Definition of Done:** User resolves all amber/red rows; refreshing the page shows corrections intact; no row auto-accepted without user action.

---

## Sprint 5 — Preview, export, and delete
**Goal:** Final table previews correctly; all export formats download; delete wipes data.

- [ ] Live four-column preview: Subject | Teacher | Tel. No. | Email Address — correct styling (grey header, bold centred, thin borders)
- [ ] Toggle: one teacher per row vs. group under subject
- [ ] Export DOCX (docx library), XLSX (SheetJS), PDF (jsPDF), CSV (formula-injection safe), clipboard HTML
- [ ] Filename includes class + year + semester
- [ ] Optional: detect `{{TEACHER_CONTACT_TABLE}}` placeholder in uploaded DOCX; replace and offer preview
- [ ] Log every export to `export_logs`
- [ ] Delete/reset button: confirm dialog → delete Storage files → clear session rows → return to upload
- [ ] File-size + type enforcement on server path as second layer

**Definition of Done:** DOCX opens in Word with editable table; XLSX opens in Excel; delete button removes all rows and storage files verified in Supabase dashboard.

---

## Sprint 6 — Polish, error handling, demo mode
**Goal:** All error cases handled; app is accessible and demoable without real data.

- [ ] All 11 error message cases implemented with clear copy
- [ ] Demo mode loads seed session 602 with pre-matched records; no upload required
- [ ] OCR progress indicator (page N of M)
- [ ] Accessibility: ARIA labels, keyboard navigation through review table, focus management
- [ ] Responsive layout: laptop and tablet breakpoints
- [ ] Sanitise all extracted text before render; validate all file MIME types server-side
- [ ] README: installation, env vars, Supabase setup, deployment to Vercel

**Definition of Done:** Demo mode shows complete 602 session without any upload; all 11 error states trigger correct messages; keyboard-only navigation reaches every interactive element.

---

## Sprint 7 — Lock it down (auth + per-user RLS)
**Goal:** Real staff data is protected; each user sees only their own sessions.

- [ ] Enable Supabase Auth (magic link or school SSO)
- [ ] Set `user_id` on all rows at session creation
- [ ] Replace v1 permissive RLS with `auth.uid() = user_id` policies on all tables
- [ ] Storage paths enforce `userId/sessionId/` prefix
- [ ] Demo mode remains accessible without login (reads seed rows only)
- [ ] Redirect unauthenticated users to login (except demo mode)
- [ ] Session auto-expiry: Edge Function deletes rows + files older than 24 h

**Definition of Done:** Two test accounts cannot see each other's sessions; anonymous user sees demo mode only; seed rows still display for demo.

---

## Gantt
```
Sprint 1  |████| DB + upload UI
Sprint 2  |████| Extraction engine        ← core engine
Sprint 3  |████| Matching engine
Sprint 4  |████| Review screen            ← v1 functional ✦
Sprint 5  |████| Preview + export
Sprint 6  |████| Polish + demo mode
Sprint 7  |████| Auth + RLS lock-down
```
