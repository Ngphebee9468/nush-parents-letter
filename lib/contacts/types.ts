export type Stage = "upload" | "extract" | "match" | "review" | "export";

export type SessionRecord = {
  id: string;
  class_name: string;
  academic_year: string;
  semester: string;
  email_domain: string;
  email_prefix: string;
  tel_prefix_6: string;
  tel_prefix_1: string;
  timetable_file_name: string;
  directory_file_name: string;
  letter_template_file_name?: string | null;
  status: string;
};

export type TimetableRecord = {
  id: string;
  session_id: string;
  class_name: string;
  subject_raw: string;
  subject_display: string;
  teacher_initials_raw: string;
  teacher_initials_normalised: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  source_text: string;
  extraction_confidence: number;
  extraction_confidence_source: "pdf_text_extract" | "ocr" | "manual";
  included: boolean;
};

export type StaffRecord = {
  id: string;
  session_id: string;
  full_name: string;
  title?: string;
  initials_raw: string;
  initials_normalised: string;
  department?: string;
  extension_raw?: string;
  full_telephone: string;
  telephone_review_required: boolean;
  email: string;
  email_username: string;
  worksheet_name?: string;
  source_row?: number;
};

export type MatchStatus =
  | "confirmed_exact"
  | "probable"
  | "multiple_possible"
  | "no_match"
  | "manually_selected"
  | "excluded";

export type MatchRecord = {
  id: string;
  session_id: string;
  timetable_record_id: string;
  staff_record_id: string | null;
  match_method: string;
  confidence: number;
  confidence_source: "matching_engine";
  confidence_review_status: "unreviewed" | "reviewed";
  status: MatchStatus;
  possible_matches: { staff_record_id: string; score: number; reason: string }[];
  manually_confirmed: boolean;
  corrected_initials?: string | null;
  manual_name?: string;
  manual_tel?: string;
  manual_email?: string;
  notes?: string | null;
};

export type AppData = {
  session: SessionRecord;
  timetable: TimetableRecord[];
  staff: StaffRecord[];
  matches: MatchRecord[];
};
