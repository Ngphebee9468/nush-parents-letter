# Data Model

## sessions
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | for future auth |
| class_name | text | e.g. `602` |
| academic_year | text | e.g. `2025/2026` |
| semester | text | e.g. `Semester 2` |
| email_domain | text | default `nus.edu.sg` |
| email_prefix | text | default `nhs` |
| tel_prefix_6 | text | default `6516` |
| tel_prefix_1 | text | default `6601` |
| timetable_file_name | text | |
| directory_file_name | text | |
| letter_template_file_name | text nullable | |
| status | text | `uploading` / `extracting` / `matching` / `reviewing` / `reviewed` / `exported` |
| created_at | timestamptz | |

## timetable_records
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| session_id | uuid | FK → sessions |
| class_name | text | |
| subject_raw | text | as seen in PDF |
| subject_display | text | after rename |
| teacher_initials_raw | text | as seen |
| teacher_initials_normalised | text | uppercase, no punctuation |
| day / start_time / end_time | text | |
| venue | text | |
| source_text | text | raw cell text |
| extraction_confidence | numeric | **AI field** |
| extraction_confidence_source | text | `pdf_text_extract` / `ocr` |
| extraction_confidence_review_status | text | `unreviewed` / `confirmed` |
| included | boolean | user toggle |

## staff_records
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| session_id | uuid | |
| full_name / title | text | |
| initials_raw / initials_normalised | text | |
| department | text | |
| extension_raw | text | raw value |
| full_telephone | text | formatted `XXXX XXXX` |
| telephone_review_required | boolean | true for ambiguous 4-digit ext |
| email / email_username | text | |
| worksheet_name | text | source sheet |
| source_row | integer | |

## match_records
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| session_id | uuid | |
| timetable_record_id | uuid | |
| staff_record_id | uuid nullable | null = no match |
| match_method | text | `exact_initials` / `email_username` / `name_derived` / `dept_hint` / `fuzzy_suggest` / `manual` |
| confidence | numeric | **AI field** |
| confidence_source | text | `matching_engine` |
| confidence_review_status | text | `unreviewed` / `reviewed` |
| status | text | `confirmed_exact` / `probable` / `multiple_possible` / `no_match` / `manually_selected` |
| possible_matches | jsonb | array of candidate staff_record_ids with scores |
| manually_confirmed | boolean | |
| corrected_initials | text | if user fixed extraction |
| notes | text | |

## export_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| session_id | uuid | |
| export_format | text | `docx` / `xlsx` / `pdf` / `csv` / `clipboard` |
| file_name | text | |
| row_count | integer | |
| included_subjects | jsonb | list of subject names exported |

## RLS
All tables: permissive v1 policies (select + all using true). Replaced with `auth.uid() = user_id` at lock-down sprint.
