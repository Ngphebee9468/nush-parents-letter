# Intelligence Layer

## Messy Inputs
- PDF cells like `"Chem Hon 6 / MK / YT / FSSF / Theatrette"` — mixed subjects, initials, venues
- Directory columns labelled `"Initial"`, `"Staff Code"`, `"Ext"`, `"Tel"` — inconsistent headers
- Extensions like `"68533"`, `"11807"`, `"8533"`, `"(65) 6516-8533"` — all mean the same number
- Single-letter codes like `"D"` — ambiguous

## Auto-Structure Schema (per timetable cell)
```json
{
  "source_text": "Bio Hon 6 / THC / E2-14",
  "subject_raw": "Bio Hon 6",
  "teacher_initials": ["THC"],
  "venue": "E2-14",
  "extraction_confidence": 0.95,
  "extraction_method": "pdf_text_extract",
  "tokens_excluded": ["E2-14"]
}
```

## Scoring Rules (rule-based, no LLM required)
| Match method | Confidence |
|---|---|
| Exact normalised initials | 1.0 |
| Email-username suffix match | 0.95 |
| Name-derived initials | 0.85 |
| Dept-hint tiebreak | +0.05 bonus |
| Fuzzy (Levenshtein ≤ 1) | 0.60 — suggest only, never auto-confirm |
| No match | 0.0 |

Single-letter initials: confidence capped at 0.50 unless exactly one directory record has that code.

## What Gets Ranked
- `match_records.confidence` — drives row highlight colour in review screen
- Rows with confidence < configurable threshold (default 0.90) are highlighted for review

## v1 vs Later
**v1:** All scoring is deterministic rule-based code.
**Later:** LLM-assisted subject-name normalisation; OCR post-processing with language model correction.
