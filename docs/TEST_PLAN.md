# Test Plan

## Mandatory Phone Conversion Tests (unit, `/lib/normalise.test.ts`)
| Input | Expected output |
|---|---|
| `68533` | `6516 8533` |
| `68639` | `6516 8639` |
| `11804` | `6601 1804` |
| `11914` | `6601 1914` |
| `65168533` | `6516 8533` |
| `66011804` | `6601 1804` |
| `""` (missing) | blank value + warning flag |
| `8533` (4-digit) | telephone_review_required = true, no number generated |

## Mandatory Matching Test (unit, `/lib/matching.test.ts`)
Input: timetable initials `LCS`, directory row `Mr Lim Chong Shen / nhslcs@nus.edu.sg / ext 68533`
Expected: status `confirmed_exact`, match_method `exact_initials`, Tel `6516 8533`, Email `nhslcs@nus.edu.sg`

## Mandatory Ambiguity Test
Input: timetable initials `D`
Expected: status `multiple_possible` (or `no_match`), staff_record_id null, row highlighted for review.

## End-to-End Success Scenario (manual)
1. Open `/` — demo class 602 data visible without login.
2. Click Upload Timetable → upload `Timetable_602_S2.pdf` → file name appears, no error.
3. Click Upload Directory → upload `Staff_Directory_2026.xlsx` → file name appears.
4. Click Process → progress bar advances through Extract and Match stages.
5. Review screen shows 5 rows; LCS row shows green Confirmed badge, Tel `6516 8533`.
6. One amber row (e.g. `MT`) — user selects correct staff from dropdown → row turns green.
7. Rename `ELC 6` → `English Language and Communication` → appears in preview.
8. Click Preview → four-column table renders with correct styling.
9. Click Download DOCX → file downloads; open in Word → editable table present.
10. Click Download XLSX → file opens in Excel → four columns, no formula injection.
11. Click Delete → confirm dialog → redirected to upload page; Supabase shows no rows for that session.

## Empty / Error Cases
| Scenario | Expected message |
|---|---|
| Upload non-PDF for timetable | "Unsupported file type. Please upload a PDF." |
| PDF with no text layer | "No text detected. Switching to OCR…" |
| XLSX with unrecognised headers | "Could not identify required columns. Please check the directory format." |
| Timetable with zero initials extracted | "No teacher initials found. Please review the timetable." |
| Initials not in directory | Row shows status `no_match` in red; export still proceeds with blank name/tel/email |
| Password-protected PDF | "This file is password-protected and cannot be read." |
| File over size limit | "File too large. Maximum size is 20 MB for PDFs." |
| Export with unresolved uncertain rows | Warning banner: "X rows are still unreviewed. Download anyway?" |

## Regression Checks (re-run each sprint)
- Phone conversion unit tests: all 8 cases pass.
- Matching unit tests: LCS confirmed, D ambiguous, missing ext blank.
- Demo mode loads without login and shows class 602 data.
- Delete button leaves zero rows in sessions table for that session_id.
- No raw Storage URLs appear in browser network tab.
