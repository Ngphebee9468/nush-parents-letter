create table if not exists user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher')),
  created_at timestamptz not null default now()
);

alter table user_roles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions
    where id = target_session_id
      and user_id = auth.uid()
  );
$$;

drop policy if exists "sessions_v1_read" on sessions;
drop policy if exists "sessions_v1_write" on sessions;
create policy "sessions_owner_or_admin_select" on sessions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "sessions_owner_insert" on sessions for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "sessions_owner_or_admin_update" on sessions for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "sessions_owner_or_admin_delete" on sessions for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "timetable_records_v1_read" on timetable_records;
drop policy if exists "timetable_records_v1_write" on timetable_records;
create policy "timetable_records_session_select" on timetable_records for select to authenticated using (public.owns_session(session_id) or public.is_admin());
create policy "timetable_records_session_insert" on timetable_records for insert to authenticated with check (public.owns_session(session_id) or public.is_admin());
create policy "timetable_records_session_update" on timetable_records for update to authenticated using (public.owns_session(session_id) or public.is_admin()) with check (public.owns_session(session_id) or public.is_admin());
create policy "timetable_records_session_delete" on timetable_records for delete to authenticated using (public.owns_session(session_id) or public.is_admin());

drop policy if exists "staff_records_v1_read" on staff_records;
drop policy if exists "staff_records_v1_write" on staff_records;
create policy "staff_records_authenticated_select" on staff_records for select to authenticated using (true);
create policy "staff_records_admin_insert" on staff_records for insert to authenticated with check (public.is_admin());
create policy "staff_records_admin_update" on staff_records for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff_records_admin_delete" on staff_records for delete to authenticated using (public.is_admin());

drop policy if exists "match_records_v1_read" on match_records;
drop policy if exists "match_records_v1_write" on match_records;
create policy "match_records_session_select" on match_records for select to authenticated using (public.owns_session(session_id) or public.is_admin());
create policy "match_records_session_insert" on match_records for insert to authenticated with check (public.owns_session(session_id) or public.is_admin());
create policy "match_records_session_update" on match_records for update to authenticated using (public.owns_session(session_id) or public.is_admin()) with check (public.owns_session(session_id) or public.is_admin());
create policy "match_records_session_delete" on match_records for delete to authenticated using (public.owns_session(session_id) or public.is_admin());

drop policy if exists "export_logs_v1_read" on export_logs;
drop policy if exists "export_logs_v1_write" on export_logs;
create policy "export_logs_owner_or_admin_select" on export_logs for select to authenticated using (user_id = auth.uid() or public.owns_session(session_id) or public.is_admin());
create policy "export_logs_owner_insert" on export_logs for insert to authenticated with check (user_id = auth.uid() or public.owns_session(session_id) or public.is_admin());
create policy "export_logs_owner_or_admin_delete" on export_logs for delete to authenticated using (user_id = auth.uid() or public.owns_session(session_id) or public.is_admin());

drop policy if exists "user_roles_admin_select" on user_roles;
drop policy if exists "user_roles_admin_write" on user_roles;
create policy "user_roles_self_or_admin_select" on user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "user_roles_admin_insert" on user_roles for insert to authenticated with check (public.is_admin());
create policy "user_roles_admin_update" on user_roles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "user_roles_admin_delete" on user_roles for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('timetable-imports', 'timetable-imports', false),
  ('staff-directory-imports', 'staff-directory-imports', false),
  ('generated-letters', 'generated-letters', false)
on conflict (id) do update set public = false;

drop policy if exists "session_files_authenticated_read" on storage.objects;
drop policy if exists "session_files_authenticated_write" on storage.objects;
drop policy if exists "private_timetable_admin_all" on storage.objects;
drop policy if exists "private_staff_admin_all" on storage.objects;
drop policy if exists "generated_letters_owner_or_admin_read" on storage.objects;
drop policy if exists "generated_letters_owner_or_admin_write" on storage.objects;

create policy "private_timetable_admin_all" on storage.objects
for all to authenticated
using (bucket_id = 'timetable-imports' and public.is_admin())
with check (bucket_id = 'timetable-imports' and public.is_admin());

create policy "private_staff_admin_all" on storage.objects
for all to authenticated
using (bucket_id = 'staff-directory-imports' and public.is_admin())
with check (bucket_id = 'staff-directory-imports' and public.is_admin());

create policy "generated_letters_owner_or_admin_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'generated-letters'
  and (
    public.is_admin()
    or owner = auth.uid()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "generated_letters_owner_or_admin_write" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'generated-letters'
  and (
    public.is_admin()
    or owner = auth.uid()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);
