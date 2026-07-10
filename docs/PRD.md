# PRD — Class Teacher Contact Table Generator

## Problem
Each semester, school staff manually look up teacher names, phone numbers and email addresses from a staff directory for every class timetable, then type them into a parent letter. The process is slow, error-prone, and repeated across many classes.

## Target User
School teachers and administrative staff with no coding knowledge, working on laptops (Chrome / Edge).

## Core Objects
- **Session** — one upload job (class, academic year, semester, file refs, status)
- **TimetableRecord** — one extracted lesson cell (subject, initials, day, time, venue, confidence)
- **StaffRecord** — one normalised staff row from the directory (name, initials, telephone, email)
- **MatchRecord** — links a TimetableRecord to a StaffRecord (method, confidence, status, corrections)
- **ExportLog** — records every download (format, filename, row count)

## MVP Must-Haves
- [ ] Upload PDF timetable, XLSX/CSV directory, optional DOCX letter template
- [ ] Extract teacher initials and subject from every timetable cell; filter rooms/times/venues
- [ ] OCR fallback for image-based PDFs
- [ ] Normalise directory: initials (uppercase), phone prefixes (6516/6601), email cleanup
- [ ] Match initials to staff (exact → email-username → name-derived → dept hint → fuzzy suggest only)
- [ ] Review screen: highlight uncertain rows, dropdown search, manual entry, merge/split rows
- [ ] Four-column preview table: Subject | Teacher | Tel. No. | Email Address
- [ ] Export: DOCX, XLSX, PDF, CSV, clipboard
- [ ] Settings panel (year, semester, class, domain, prefixes, subject-name map)
- [ ] Delete/reset button wipes session and storage files
- [ ] Demo mode with sample data (class 602)

## Non-Goals (v1)
- User login / multi-user accounts
- Batch multi-class processing
- PNG/JPG timetable upload
- Parents' Gateway direct integration
- Admin usage dashboard

## Success Criteria
A staff member uploads `Timetable_602_S2.pdf` and `Staff_Directory_2026.xlsx`, clicks through the five-stage flow, corrects one ambiguous match, and downloads `Class_602_Teacher_Contacts_S2_2026.docx` — with correct names, phone numbers in `XXXX XXXX` format, and email addresses — in under five minutes. The LCS test case must produce Tel `6516 8533` with status `confirmed_exact`.
