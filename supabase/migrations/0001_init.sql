create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  class_name text,
  academic_year text,
  semester text,
  email_domain text default 'nus.edu.sg',
  email_prefix text default 'nhs',
  tel_prefix_6 text default '6516',
  tel_prefix_1 text default '6601',
  timetable_file_name text,
  directory_file_name text,
  letter_template_file_name text,
  status text default 'uploading',
  created_at timestamptz not null default now()
);
alter table sessions enable row level security;
drop policy if exists "sessions_v1_read" on sessions;
create policy "sessions_v1_read" on sessions for select using (true);
drop policy if exists "sessions_v1_write" on sessions;
create policy "sessions_v1_write" on sessions for all using (true) with check (true);

create table if not exists timetable_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  class_name text,
  subject_raw text,
  subject_display text,
  teacher_initials_raw text,
  teacher_initials_normalised text,
  day text,
  start_time text,
  end_time text,
  venue text,
  source_text text,
  extraction_confidence numeric,
  extraction_confidence_source text,
  extraction_confidence_review_status text default 'unreviewed',
  included boolean default true,
  created_at timestamptz not null default now()
);
alter table timetable_records enable row level security;
drop policy if exists "timetable_records_v1_read" on timetable_records;
create policy "timetable_records_v1_read" on timetable_records for select using (true);
drop policy if exists "timetable_records_v1_write" on timetable_records;
create policy "timetable_records_v1_write" on timetable_records for all using (true) with check (true);

create table if not exists staff_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  full_name text,
  title text,
  initials_raw text,
  initials_normalised text,
  department text,
  extension_raw text,
  full_telephone text,
  telephone_review_required boolean default false,
  email text,
  email_username text,
  worksheet_name text,
  source_row integer,
  created_at timestamptz not null default now()
);
alter table staff_records enable row level security;
drop policy if exists "staff_records_v1_read" on staff_records;
create policy "staff_records_v1_read" on staff_records for select using (true);
drop policy if exists "staff_records_v1_write" on staff_records;
create policy "staff_records_v1_write" on staff_records for all using (true) with check (true);

create table if not exists match_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  timetable_record_id uuid,
  staff_record_id uuid,
  match_method text,
  confidence numeric,
  confidence_source text,
  confidence_review_status text default 'unreviewed',
  status text default 'unreviewed',
  possible_matches jsonb,
  manually_confirmed boolean default false,
  corrected_initials text,
  notes text,
  created_at timestamptz not null default now()
);
alter table match_records enable row level security;
drop policy if exists "match_records_v1_read" on match_records;
create policy "match_records_v1_read" on match_records for select using (true);
drop policy if exists "match_records_v1_write" on match_records;
create policy "match_records_v1_write" on match_records for all using (true) with check (true);

create table if not exists export_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  export_format text,
  file_name text,
  row_count integer,
  included_subjects jsonb,
  created_at timestamptz not null default now()
);
alter table export_logs enable row level security;
drop policy if exists "export_logs_v1_read" on export_logs;
create policy "export_logs_v1_read" on export_logs for select using (true);
drop policy if exists "export_logs_v1_write" on export_logs;
create policy "export_logs_v1_write" on export_logs for all using (true) with check (true);

insert into sessions (id, class_name, academic_year, semester, status, timetable_file_name, directory_file_name) values
  ('a1000000-0000-0000-0000-000000000001', '602', '2025/2026', 'Semester 2', 'reviewed', 'Timetable_602_S2.pdf', 'Staff_Directory_2026.xlsx'),
  ('a1000000-0000-0000-0000-000000000002', '504', '2025/2026', 'Semester 2', 'exported', 'Timetable_504_S2.pdf', 'Staff_Directory_2026.xlsx');

insert into staff_records (id, session_id, full_name, title, initials_raw, initials_normalised, department, extension_raw, full_telephone, email, email_username, worksheet_name, source_row) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Mr Lim Chong Shen', 'Mr', 'LCS', 'LCS', 'English Language', '68533', '6516 8533', 'nhslcs@nus.edu.sg', 'nhslcs', 'Staff Directory', 12),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Ms Ng Oh Hwee', 'Ms', 'NOH', 'NOH', 'Biology', '68639', '6516 8639', 'nhsnoh@nus.edu.sg', 'nhsnoh', 'Staff Directory', 34),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Mr Tan Hock Chuan', 'Mr', 'THC', 'THC', 'Biology', '11804', '6601 1804', 'nhsthc@nus.edu.sg', 'nhsthc', 'Staff Directory', 56),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Mr Balasubramaniam Raveen Wen', 'Mr', 'BRW', 'BRW', 'Physics', '11914', '6601 1914', 'nhsbrw@nus.edu.sg', 'nhsbrw', 'Staff Directory', 78),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'Ms Muthu Tamilarasi', 'Ms', 'MT', 'MT', 'English Language', '68412', '6516 8412', 'nhsmt@nus.edu.sg', 'nhsmt', 'Staff Directory', 91);

insert into timetable_records (id, session_id, class_name, subject_raw, subject_display, teacher_initials_raw, teacher_initials_normalised, day, start_time, end_time, venue, source_text, extraction_confidence, extraction_confidence_source, included) values
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '602', 'ELC 6', 'English Language and Communication', 'LCS', 'LCS', 'Monday', '08:00', '09:00', 'E5-12', 'ELC 6 / LCS / E5-12', 0.97, 'pdf_text_extract', 'unreviewed'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '602', 'Bio 6', 'Biology', 'NOH', 'NOH', 'Tuesday', '10:00', '11:00', 'E5-10', 'Bio 6 / NOH / E5-10', 0.97, 'pdf_text_extract', 'unreviewed'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', '602', 'Bio Hon 6', 'Biology Honours', 'THC', 'THC', 'Wednesday', '13:00', '14:00', 'E2-14', 'Bio Hon 6 / THC / E2-14', 0.95, 'pdf_text_extract', 'unreviewed'),
  ('c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', '602', 'Phys Hon 6', 'Physics Honours', 'BRW', 'BRW', 'Thursday', '08:00', '09:00', 'E5-12', 'Phys Hon 6 / BRW / E5-12', 0.96, 'pdf_text_extract', 'unreviewed'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', '602', 'EL 6', 'English Language', 'MT', 'MT', 'Friday', '10:00', '11:00', 'E5-10', 'EL 6 / MT / E5-10', 0.94, 'pdf_text_extract', 'unreviewed');

insert into match_records (id, session_id, timetable_record_id, staff_record_id, match_method, confidence, confidence_source, confidence_review_status, status, manually_confirmed) values
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'exact_initials', 1.0, 'matching_engine', 'reviewed', 'confirmed_exact', false),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'exact_initials', 1.0, 'matching_engine', 'reviewed', 'confirmed_exact', false),
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'exact_initials', 1.0, 'matching_engine', 'reviewed', 'confirmed_exact', false),
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'exact_initials', 1.0, 'matching_engine', 'reviewed', 'confirmed_exact', false),
  ('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 'exact_initials', 1.0, 'matching_engine', 'reviewed', 'confirmed_exact', false);