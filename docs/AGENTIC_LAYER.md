# Agentic Layer

## Risk Classification

### Low — Auto-execute (no approval needed)
- Extract text from uploaded PDF and write `timetable_records`
- Parse spreadsheet and write `staff_records`
- Run matching engine and write `match_records` with statuses
- Rename subject using the configured subject-name map
- Apply phone-prefix conversion rules

### Medium — Requires user confirmation before persisting
- Accept a `probable` match (user clicks Confirm on a suggested match)
- Merge two duplicate teacher rows
- Apply a subject rename that differs from the standard map

### High — User must explicitly act (no auto-trigger)
- Export and download any file containing staff contact data
- Replace a matched staff record with a manually typed entry

### Critical — Human only, no automation
- Delete all session data and uploaded files (requires explicit button click + confirmation dialog)
- Any action that would overwrite the original uploaded letter template

## Named Tools (approved)
| Tool | Action |
|---|---|
| `extractTimetable(sessionId)` | Run pdfjs + cell parser; write timetable_records |
| `parseDirectory(sessionId)` | Run SheetJS + normaliser; write staff_records |
| `runMatching(sessionId)` | Run matching engine; write match_records |
| `confirmMatch(matchId, staffId)` | Set manually_confirmed = true |
| `exportTable(sessionId, format)` | Generate file; write export_logs |
| `deleteSession(sessionId)` | Remove Storage files; clear all rows |

## Audit Log Fields (export_logs + match_records)
- `session_id`, `timetable_record_id`, `staff_record_id`, `match_method`, `status`, `manually_confirmed`, `corrected_initials`, `notes`, `created_at`

## v1 vs Later
**v1:** All tools triggered by explicit user button clicks.
**Later:** Background auto-run of extraction + matching on file upload completion.
