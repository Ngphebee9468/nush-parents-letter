import type { AppData, StaffRecord, TimetableRecord } from "./types";

export const demoSessionId = "a1000000-0000-0000-0000-000000000001";

export const demoStaff: StaffRecord[] = [
  ["Mr Lim Chong Shen", "LCS", "English Language", "68533", "6516 8533", "nhslcs@nus.edu.sg"],
  ["Ms Ng Oon Hui", "NOH", "Biology", "68639", "6516 8639", "nhsnoh@nus.edu.sg"],
  ["Mr Tan Hock Chuan", "THC", "Biology", "11804", "6601 1804", "nhsthc@nus.edu.sg"],
  ["Mr Balasubramaniam Raveen Wen", "BRW", "Physics", "11914", "6601 1914", "nhsbrw@nus.edu.sg"],
  ["Ms Muthu Tamilarasi", "MT", "English Language", "68412", "6516 8412", "nhsmt@nus.edu.sg"],
  ["Ms Diana Lim", "D", "Mathematics", "8533", "", "nhsdlim@nus.edu.sg"],
  ["Mr Daniel Seah", "D", "Mathematics", "11807", "6601 1807", "nhsdseah@nus.edu.sg"],
].map((row, index) => ({
  id: `b1000000-0000-0000-0000-00000000000${index + 1}`,
  session_id: demoSessionId,
  full_name: row[0],
  initials_raw: row[1],
  initials_normalised: row[1],
  department: row[2],
  extension_raw: row[3],
  full_telephone: row[4],
  telephone_review_required: row[4] === "",
  email: row[5],
  email_username: row[5].split("@")[0],
  worksheet_name: "Staff Directory",
  source_row: index + 12,
}));

export const demoTimetable: TimetableRecord[] = [
  ["ELC 6", "English Language and Communication", "LCS", "Monday", "08:00", "09:00", "E5-12"],
  ["Bio 6", "Biology", "NOH", "Tuesday", "10:00", "11:00", "E5-10"],
  ["Bio Hon 6", "Biology Honours", "THC", "Wednesday", "13:00", "14:00", "E2-14"],
  ["Phys Hon 6", "Physics Honours", "BRW", "Thursday", "08:00", "09:00", "E5-12"],
  ["EL 6", "English Language", "MT", "Friday", "10:00", "11:00", "E5-10"],
  ["Math 6", "Mathematics", "D", "Friday", "11:00", "12:00", "E5-11"],
].map((row, index) => ({
  id: `c1000000-0000-0000-0000-00000000000${index + 1}`,
  session_id: demoSessionId,
  class_name: "602",
  subject_raw: row[0],
  subject_display: row[1],
  teacher_initials_raw: row[2],
  teacher_initials_normalised: row[2],
  day: row[3],
  start_time: row[4],
  end_time: row[5],
  venue: row[6],
  source_text: `${row[0]} / ${row[2]} / ${row[6]}`,
  extraction_confidence: 0.95,
  extraction_confidence_source: "pdf_text_extract",
  included: true,
}));

export function demoData(): AppData {
  return {
    session: {
      id: demoSessionId,
      class_name: "602",
      academic_year: "2025/2026",
      semester: "Semester 2",
      email_domain: "nus.edu.sg",
      email_prefix: "nhs",
      tel_prefix_6: "6516",
      tel_prefix_1: "6601",
      timetable_file_name: "Timetable_602_S2.pdf",
      directory_file_name: "Staff_Directory_2026.xlsx",
      status: "reviewing",
    },
    timetable: demoTimetable,
    staff: demoStaff,
    matches: [],
  };
}
