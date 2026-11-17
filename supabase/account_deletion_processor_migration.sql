-- ============================================================================
-- Progrezzia - eliminacion real, durable e idempotente de cuentas
--
-- Es autocontenida e idempotente: puede ejecutarse aunque la migracion inicial
-- de solicitudes todavia no exista. Ejecutar manualmente una sola vez desde
-- Supabase SQL Editor. El worker elimina Storage, luego los datos publicos y
-- por ultimo Auth. Un entrenador con alumnos queda en revision.
-- ============================================================================

begin;

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  account_role text,
  status text not null default 'pending'
    check (status in ('pending', 'cancelled', 'completed')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null default (now() + interval '7 days'),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.account_deletion_requests
  add column if not exists id uuid,
  add column if not exists subject_user_id uuid,
  add column if not exists subject_student_id uuid,
  add column if not exists processor_schema_version text,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists processing_started_at timestamptz,
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists storage_deleted_at timestamptz,
  add column if not exists storage_objects_deleted integer not null default 0,
  add column if not exists public_data_deleted_at timestamptz,
  add column if not exists deleted_counts jsonb not null default '{}'::jsonb,
  add column if not exists auth_delete_started_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists last_error_code text,
  add column if not exists last_error_at timestamptz;

-- Las filas que ya existían antes de esta migración quedan marcadas como
-- legacy. La marca vive en la propia tabla y funciona aunque SQL Editor cambie
-- de sesión entre sentencias.
update public.account_deletion_requests
set processor_schema_version = 'legacy-v0'
where processor_schema_version is null;

alter table public.account_deletion_requests
  alter column processor_schema_version set default '2026-11-17-v1';

alter table public.account_deletion_requests
  alter column processor_schema_version set not null;

update public.account_deletion_requests r
set
  id = coalesce(r.id, gen_random_uuid()),
  subject_user_id = coalesce(r.subject_user_id, r.user_id),
  subject_student_id = coalesce(r.subject_student_id, p.student_id),
  account_role = coalesce(r.account_role, p.role),
  next_attempt_at = coalesce(r.next_attempt_at, r.scheduled_for)
from public.profiles p
where p.id = r.user_id;

update public.account_deletion_requests
set
  id = coalesce(id, gen_random_uuid()),
  subject_user_id = coalesce(subject_user_id, user_id),
  next_attempt_at = coalesce(next_attempt_at, scheduled_for)
where id is null
   or subject_user_id is null
   or next_attempt_at is null;

alter table public.account_deletion_requests
  alter column id set default gen_random_uuid(),
  alter column id set not null;

do $block$
declare
  v_constraint record;
  v_user_attnum smallint;
begin
  select a.attnum::smallint
    into v_user_attnum
  from pg_attribute a
  where a.attrelid = 'public.account_deletion_requests'::regclass
    and a.attname = 'user_id'
    and not a.attisdropped;

  for v_constraint in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.account_deletion_requests'::regclass
      and (
        c.contype = 'p'
        or (
          c.contype = 'f'
          and c.confrelid = 'auth.users'::regclass
          and cardinality(c.conkey) = 1
          and v_user_attnum = any(c.conkey)
        )
      )
  loop
    execute format(
      'alter table public.account_deletion_requests drop constraint %I',
      v_constraint.conname
    );
  end loop;
end;
$block$;

alter table public.account_deletion_requests
  alter column user_id drop not null;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_pkey primary key (id),
  add constraint account_deletion_requests_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.account_deletion_requests'::regclass
      and c.conname = 'account_deletion_requests_user_id_key'
  ) then
    alter table public.account_deletion_requests
      add constraint account_deletion_requests_user_id_key unique (user_id);
  end if;
end;
$block$;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in (
    'pending', 'processing', 'retry_wait', 'needs_review',
    'failed', 'cancelled', 'completed'
  ));

update public.account_deletion_requests r
set status = 'needs_review',
    blocked_reason = 'legacy_request_requires_confirmation',
    next_attempt_at = null,
    updated_at = now()
where r.status = 'pending'
  and r.processor_schema_version = 'legacy-v0';

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_account_role_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_account_role_check
  check (account_role is null or account_role in ('student', 'trainer'));

create index if not exists account_deletion_requests_due_idx
  on public.account_deletion_requests (scheduled_for, next_attempt_at)
  where status in ('pending', 'retry_wait', 'processing');

create table if not exists public.account_deletion_receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  account_role text not null check (account_role in ('student', 'trainer')),
  requested_at timestamptz not null,
  completed_at timestamptz not null default now(),
  processor_version text not null,
  deleted_counts jsonb not null default '{}'::jsonb,
  storage_objects_deleted integer not null default 0
);

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_receipts enable row level security;

drop policy if exists user_select_own_deletion_request
  on public.account_deletion_requests;
create policy user_select_own_deletion_request
on public.account_deletion_requests
for select to authenticated
using (user_id = auth.uid());

revoke all on table public.account_deletion_requests from anon;
revoke insert, update, delete on table public.account_deletion_requests from authenticated;
grant select on table public.account_deletion_requests to authenticated;

revoke all on table public.account_deletion_receipts from public, anon, authenticated;
grant select, insert, update on table public.account_deletion_receipts to service_role;

create or replace function public.request_own_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_role text;
  v_student_id uuid;
  v_scheduled_for timestamptz;
begin
  if v_user_id is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;
  select p.role, p.student_id into v_role, v_student_id
  from public.profiles p where p.id = v_user_id;

  if v_role is null or v_role not in ('student', 'trainer') then
    raise exception 'La cuenta no tiene un rol valido para solicitar la eliminacion.';
  end if;
  if v_role = 'student' and v_student_id is null then
    raise exception 'La cuenta de alumno no esta vinculada a una ficha.';
  end if;

  insert into public.account_deletion_requests (
    user_id, subject_user_id, subject_student_id, email, account_role,
    status, requested_at, scheduled_for, next_attempt_at, completed_at, updated_at
  ) values (
    v_user_id, v_user_id, v_student_id, v_email, v_role,
    'pending', now(), now() + interval '7 days', now() + interval '7 days', null, now()
  )
  on conflict (user_id) do update set
    subject_user_id = excluded.subject_user_id,
    subject_student_id = excluded.subject_student_id,
    email = excluded.email,
    account_role = excluded.account_role,
    processor_schema_version = case
      when account_deletion_requests.status = 'cancelled' then '2026-11-17-v1'
      else account_deletion_requests.processor_schema_version
    end,
    status = case when account_deletion_requests.status = 'cancelled' then 'pending'
                  else account_deletion_requests.status end,
    requested_at = case when account_deletion_requests.status = 'cancelled' then now()
                        else account_deletion_requests.requested_at end,
    scheduled_for = case when account_deletion_requests.status = 'cancelled' then now() + interval '7 days'
                         else account_deletion_requests.scheduled_for end,
    next_attempt_at = case when account_deletion_requests.status = 'cancelled' then now() + interval '7 days'
                           else account_deletion_requests.next_attempt_at end,
    blocked_reason = case when account_deletion_requests.status = 'cancelled' then null
                          else account_deletion_requests.blocked_reason end,
    last_error_code = case when account_deletion_requests.status = 'cancelled' then null
                           else account_deletion_requests.last_error_code end,
    last_error_at = case when account_deletion_requests.status = 'cancelled' then null
                         else account_deletion_requests.last_error_at end,
    attempt_count = case when account_deletion_requests.status = 'cancelled' then 0
                         else account_deletion_requests.attempt_count end,
    processing_started_at = case when account_deletion_requests.status = 'cancelled' then null
                                 else account_deletion_requests.processing_started_at end,
    lease_token = case when account_deletion_requests.status = 'cancelled' then null
                       else account_deletion_requests.lease_token end,
    lease_expires_at = case when account_deletion_requests.status = 'cancelled' then null
                            else account_deletion_requests.lease_expires_at end,
    storage_deleted_at = case when account_deletion_requests.status = 'cancelled' then null
                              else account_deletion_requests.storage_deleted_at end,
    storage_objects_deleted = case when account_deletion_requests.status = 'cancelled' then 0
                                   else account_deletion_requests.storage_objects_deleted end,
    public_data_deleted_at = case when account_deletion_requests.status = 'cancelled' then null
                                  else account_deletion_requests.public_data_deleted_at end,
    deleted_counts = case when account_deletion_requests.status = 'cancelled' then '{}'::jsonb
                          else account_deletion_requests.deleted_counts end,
    auth_delete_started_at = case when account_deletion_requests.status = 'cancelled' then null
                                  else account_deletion_requests.auth_delete_started_at end,
    completed_at = null,
    updated_at = now()
  returning scheduled_for into v_scheduled_for;

  return v_scheduled_for;
end;
$function$;

create or replace function public.claim_due_account_deletion()
returns table (
  request_id uuid,
  subject_user_id uuid,
  account_role text,
  subject_student_id uuid,
  lease_token uuid,
  storage_deleted_at timestamptz,
  public_data_deleted_at timestamptz,
  auth_delete_started_at timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_request_id uuid;
begin
  select r.id into v_request_id
  from public.account_deletion_requests r
  where r.subject_user_id is not null
    and r.processor_schema_version = '2026-11-17-v1'
    and r.scheduled_for <= now()
    and (
      (r.status in ('pending', 'retry_wait')
       and coalesce(r.next_attempt_at, r.scheduled_for) <= now())
      or
      (r.status = 'processing'
       and coalesce(r.lease_expires_at, r.processing_started_at, r.updated_at)
             < now() - interval '5 minutes')
    )
  order by r.scheduled_for, r.requested_at
  for update skip locked
  limit 1;

  if v_request_id is null then return; end if;

  return query
  update public.account_deletion_requests r
  set status = 'processing',
      attempt_count = r.attempt_count + 1,
      processing_started_at = now(),
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + interval '15 minutes',
      blocked_reason = null,
      last_error_code = null,
      updated_at = now()
  where r.id = v_request_id
  returning r.id, r.subject_user_id, r.account_role, r.subject_student_id,
            r.lease_token, r.storage_deleted_at, r.public_data_deleted_at,
            r.auth_delete_started_at, r.attempt_count;
end;
$function$;

create or replace function public.mark_account_deletion_storage_deleted(
  p_request_id uuid,
  p_lease_token uuid,
  p_deleted_count integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.account_deletion_requests r
  set storage_deleted_at = coalesce(r.storage_deleted_at, now()),
      storage_objects_deleted = greatest(r.storage_objects_deleted, coalesce(p_deleted_count, 0)),
      lease_expires_at = now() + interval '15 minutes',
      updated_at = now()
  where r.id = p_request_id and r.status = 'processing' and r.lease_token = p_lease_token;
  return found;
end;
$function$;

create or replace function public.preflight_account_deletion(
  p_request_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_role text;
  v_user_id uuid;
  v_student_id uuid;
  v_profile_role text;
  v_profile_student_id uuid;
  v_student_count integer := 0;
begin
  select r.account_role, r.subject_user_id, r.subject_student_id
  into v_role, v_user_id, v_student_id
  from public.account_deletion_requests r
  where r.id = p_request_id
    and r.status = 'processing'
    and r.lease_token = p_lease_token;

  if not found then
    raise exception 'Lease de eliminacion invalida.' using errcode = '42501';
  end if;

  select p.role, p.student_id into v_profile_role, v_profile_student_id
  from public.profiles p where p.id = v_user_id;

  if not found then
    return jsonb_build_object('blocked', 'missing_profile');
  end if;

  if v_profile_role is distinct from v_role
      or (v_role = 'student' and v_profile_student_id is distinct from v_student_id) then
    return jsonb_build_object('blocked', 'integrity_ambiguous');
  end if;

  if v_role = 'student' then
    if v_student_id is null then
      return jsonb_build_object('blocked', 'missing_student_link');
    end if;
    if not exists (select 1 from public.students s where s.id = v_student_id) then
      return jsonb_build_object('blocked', 'missing_student_record');
    end if;
    if exists (
      select 1 from public.routines r
      join public.student_routines sr on sr.routine_id = r.id
      where r.student_id = v_student_id
        and sr.student_id is distinct from v_student_id
    ) or exists (
      select 1 from public.routines r
      join public.routine_days rd on rd.routine_id = r.id
      join public.workout_sessions ws on ws.routine_day_id = rd.id
      where r.student_id = v_student_id
        and ws.student_id is distinct from v_student_id
    ) or exists (
      select 1 from public.routines r
      join public.routine_days rd on rd.routine_id = r.id
      join public.routine_day_exercises rde on rde.routine_day_id = rd.id
      join public.exercise_logs el on el.routine_day_exercise_id = rde.id
      where r.student_id = v_student_id
        and el.student_id is distinct from v_student_id
    ) then
      return jsonb_build_object('blocked', 'student_program_cross_reference');
    end if;
    return jsonb_build_object('ok', true);
  end if;

  if v_role = 'trainer' then
    select count(*)::integer into v_student_count
    from public.students s where s.trainer_id = v_user_id;
    if v_student_count > 0 then
      return jsonb_build_object('blocked', 'trainer_requires_transfer',
                                'linked_students', v_student_count);
    end if;

    if exists (select 1 from public.routines r
               where r.trainer_id = v_user_id and r.student_id is not null)
       or exists (select 1 from public.student_routines sr
                  join public.routines r on r.id = sr.routine_id
                  where r.trainer_id = v_user_id)
       or exists (select 1 from public.workouts w
                  where w.trainer_id = v_user_id and w.student_id is not null)
       or exists (select 1 from public.contacts c
                  where c.trainer_id = v_user_id and c.student_id is not null)
       or exists (select 1 from public.coaching_conversations c
                  where c.trainer_id = v_user_id)
       or exists (select 1 from public.workout_feedback f
                  where f.trainer_id = v_user_id)
       or exists (select 1 from public.student_onboarding_profiles o
                  where o.trainer_id = v_user_id)
       or exists (select 1 from public.student_progress_photos p
                  where p.trainer_id = v_user_id)
       or exists (select 1 from public.student_weekly_checkins c
                  where c.trainer_id = v_user_id)
       or exists (select 1 from public.student_follow_ups f
                  where f.trainer_id = v_user_id)
       or exists (select 1 from public.student_notes n
                  where n.trainer_id = v_user_id)
       or exists (select 1 from public.workout_sessions ws
                  where ws.trainer_id = v_user_id) then
      return jsonb_build_object('blocked', 'trainer_dependency_requires_review');
    end if;
    return jsonb_build_object('ok', true);
  end if;

  return jsonb_build_object('blocked', 'unsupported_role');
end;
$function$;

create or replace function public.purge_account_public_data(
  p_request_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_role text;
  v_user_id uuid;
  v_student_id uuid;
  v_profile_role text;
  v_profile_student_id uuid;
  v_student_count integer := 0;
  v_count integer := 0;
  v_counts jsonb := '{}'::jsonb;
begin
  select r.account_role, r.subject_user_id, r.subject_student_id
  into v_role, v_user_id, v_student_id
  from public.account_deletion_requests r
  where r.id = p_request_id and r.status = 'processing' and r.lease_token = p_lease_token
  for update;

  if not found then
    raise exception 'Lease de eliminacion invalida.' using errcode = '42501';
  end if;

  if exists (select 1 from public.account_deletion_requests r
             where r.id = p_request_id and r.public_data_deleted_at is not null) then
    select r.deleted_counts into v_counts
    from public.account_deletion_requests r where r.id = p_request_id;
    return v_counts;
  end if;

  select p.role, p.student_id into v_profile_role, v_profile_student_id
  from public.profiles p where p.id = v_user_id;

  if not found then
    return jsonb_build_object('blocked', 'missing_profile');
  end if;

  if v_profile_role is distinct from v_role
      or (v_role = 'student' and v_profile_student_id is distinct from v_student_id) then
    return jsonb_build_object('blocked', 'integrity_ambiguous');
  end if;

  if v_role = 'student' then
    if v_student_id is null then
      return jsonb_build_object('blocked', 'missing_student_link');
    end if;

    perform 1 from public.students s where s.id = v_student_id for update;
    if not found then
      return jsonb_build_object('blocked', 'missing_student_record');
    end if;

    perform 1 from public.routines r
    where r.student_id = v_student_id
    order by r.id
    for update;

    if exists (
      select 1 from public.routines r
      join public.student_routines sr on sr.routine_id = r.id
      where r.student_id = v_student_id
        and sr.student_id is distinct from v_student_id
    ) or exists (
      select 1 from public.routines r
      join public.routine_days rd on rd.routine_id = r.id
      join public.workout_sessions ws on ws.routine_day_id = rd.id
      where r.student_id = v_student_id
        and ws.student_id is distinct from v_student_id
    ) or exists (
      select 1 from public.routines r
      join public.routine_days rd on rd.routine_id = r.id
      join public.routine_day_exercises rde on rde.routine_day_id = rd.id
      join public.exercise_logs el on el.routine_day_exercise_id = rde.id
      where r.student_id = v_student_id
        and el.student_id is distinct from v_student_id
    ) then
      return jsonb_build_object('blocked', 'student_program_cross_reference');
    end if;

    -- Las notificaciones dirigidas al entrenador pueden contener nombre,
    -- molestias y comentarios del alumno aunque el alumno no sea ni el
    -- destinatario ni el actor. Se eliminan por identidad y también por la
    -- entidad de origen antes de borrar check-ins, feedback y conversaciones.
    delete from public.internal_notifications n
    where n.recipient_user_id = v_user_id
       or n.actor_user_id = v_user_id
       or (n.entity_type = 'student' and n.entity_id = v_student_id)
       or (
         n.entity_type = 'conversation'
         and n.entity_id in (
           select c.id
           from public.coaching_conversations c
           where c.student_id = v_student_id
         )
       )
       or (
         n.entity_type = 'workout_feedback'
         and n.entity_id in (
           select f.id
           from public.workout_feedback f
           where f.student_id = v_student_id
         )
       )
       or (
         n.entity_type = 'weekly_checkin'
         and n.entity_id in (
           select c.id
           from public.student_weekly_checkins c
           where c.student_id = v_student_id
         )
       )
       or n.href = '/dashboard/students/' || v_student_id::text
       or n.href like '/dashboard/students/' || v_student_id::text || '/%'
       or n.href = '/dashboard/messages?student=' || v_student_id::text
       or n.href like '/dashboard/messages?student=' || v_student_id::text || '&%';
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('internal_notifications', v_count);

    delete from public.coaching_messages m using public.coaching_conversations c
    where m.conversation_id = c.id and c.student_id = v_student_id;
    delete from public.coaching_conversations c where c.student_id = v_student_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('coaching_conversations', v_count);

    delete from public.workout_feedback f where f.student_id = v_student_id;
    delete from public.student_progress_photos p where p.student_id = v_student_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('progress_photos', v_count);

    delete from public.contact_interactions i using public.contacts c
    where i.contact_id = c.id and c.student_id = v_student_id;
    delete from public.contacts c where c.student_id = v_student_id;
    delete from public.student_follow_ups f where f.student_id = v_student_id;
    delete from public.student_notes n where n.student_id = v_student_id;
    delete from public.student_onboarding_profiles o where o.student_id = v_student_id;
    delete from public.student_weekly_checkins c where c.student_id = v_student_id;

    delete from public.exercise_logs l where l.student_id = v_student_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('exercise_logs', v_count);
    delete from public.workout_sessions s where s.student_id = v_student_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('workout_sessions', v_count);
    delete from public.student_routines sr where sr.student_id = v_student_id;

    delete from public.workout_exercises we
    where exists (select 1 from public.workouts w
                  where w.id = we.workout_id and w.student_id = v_student_id);
    delete from public.workouts w where w.student_id = v_student_id;

    delete from public.routine_day_exercises rde
    where exists (select 1 from public.routine_days rd
                  join public.routines r on r.id = rd.routine_id
                  where rd.id = rde.routine_day_id and r.student_id = v_student_id);
    delete from public.routine_days rd
    where exists (select 1 from public.routines r
                  where r.id = rd.routine_id and r.student_id = v_student_id);
    delete from public.routine_weeks rw
    where exists (select 1 from public.routines r
                  where r.id = rw.routine_id and r.student_id = v_student_id);
    delete from public.routine_months rm
    where exists (select 1 from public.routines r
                  where r.id = rm.routine_id and r.student_id = v_student_id);
    delete from public.routines r where r.student_id = v_student_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('student_programs', v_count);

    delete from public.profiles p where p.id = v_user_id;
    delete from public.students s where s.id = v_student_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('students', v_count);

  elsif v_role = 'trainer' then
    perform 1 from public.trainers t where t.id = v_user_id for update;
    if not found then
      return jsonb_build_object('blocked', 'missing_trainer_record');
    end if;

    select count(*)::integer into v_student_count
    from public.students s where s.trainer_id = v_user_id;
    if v_student_count > 0 then
      return jsonb_build_object('blocked', 'trainer_requires_transfer',
                                'linked_students', v_student_count);
    end if;

    if exists (select 1 from public.routines r
               where r.trainer_id = v_user_id and r.student_id is not null)
       or exists (select 1 from public.student_routines sr
                  join public.routines r on r.id = sr.routine_id
                  where r.trainer_id = v_user_id)
       or exists (select 1 from public.workouts w
                  where w.trainer_id = v_user_id and w.student_id is not null)
       or exists (select 1 from public.contacts c
                  where c.trainer_id = v_user_id and c.student_id is not null)
       or exists (select 1 from public.coaching_conversations c
                  where c.trainer_id = v_user_id)
       or exists (select 1 from public.workout_feedback f
                  where f.trainer_id = v_user_id)
       or exists (select 1 from public.student_onboarding_profiles o
                  where o.trainer_id = v_user_id)
       or exists (select 1 from public.student_progress_photos p
                  where p.trainer_id = v_user_id)
       or exists (select 1 from public.student_weekly_checkins c
                  where c.trainer_id = v_user_id)
       or exists (select 1 from public.student_follow_ups f
                  where f.trainer_id = v_user_id)
       or exists (select 1 from public.student_notes n
                  where n.trainer_id = v_user_id)
       or exists (select 1 from public.workout_sessions ws
                  where ws.trainer_id = v_user_id) then
      return jsonb_build_object('blocked', 'trainer_dependency_requires_review');
    end if;

    delete from public.internal_notifications n
    where n.recipient_user_id = v_user_id or n.actor_user_id = v_user_id;
    delete from public.coaching_messages m using public.coaching_conversations c
    where m.conversation_id = c.id and c.trainer_id = v_user_id;
    delete from public.coaching_conversations c where c.trainer_id = v_user_id;
    delete from public.contact_interactions i using public.contacts c
    where i.contact_id = c.id and c.trainer_id = v_user_id;
    delete from public.contacts c where c.trainer_id = v_user_id;
    delete from public.student_follow_ups f where f.trainer_id = v_user_id;
    delete from public.student_notes n where n.trainer_id = v_user_id;

    delete from public.workout_exercises we
    where exists (select 1 from public.workouts w
                  where w.id = we.workout_id and w.trainer_id = v_user_id);
    delete from public.workouts w where w.trainer_id = v_user_id;

    delete from public.exercise_logs l
    where exists (select 1 from public.routine_day_exercises rde
                  join public.routine_days rd on rd.id = rde.routine_day_id
                  join public.routines r on r.id = rd.routine_id
                  where rde.id = l.routine_day_exercise_id and r.trainer_id = v_user_id);
    delete from public.routine_day_exercises rde
    where exists (select 1 from public.routine_days rd
                  join public.routines r on r.id = rd.routine_id
                  where rd.id = rde.routine_day_id and r.trainer_id = v_user_id);
    delete from public.routine_days rd
    where exists (select 1 from public.routines r
                  where r.id = rd.routine_id and r.trainer_id = v_user_id);
    delete from public.student_routines sr
    where exists (select 1 from public.routines r
                  where r.id = sr.routine_id and r.trainer_id = v_user_id);
    delete from public.routine_weeks rw
    where exists (select 1 from public.routines r
                  where r.id = rw.routine_id and r.trainer_id = v_user_id);
    delete from public.routine_months rm
    where exists (select 1 from public.routines r
                  where r.id = rm.routine_id and r.trainer_id = v_user_id);
    delete from public.routines r where r.trainer_id = v_user_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('routines', v_count);

    delete from public.trainer_exercise_overrides o where o.trainer_id = v_user_id;
    delete from public.exercises e where e.trainer_id = v_user_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('custom_exercises', v_count);
    delete from public.trainer_profiles tp where tp.trainer_id = v_user_id;
    delete from public.profiles p where p.id = v_user_id;
    delete from public.trainers t where t.id = v_user_id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || jsonb_build_object('trainers', v_count);
  else
    return jsonb_build_object('blocked', 'unsupported_role');
  end if;

  update public.account_deletion_requests r
  set public_data_deleted_at = now(), deleted_counts = v_counts,
      lease_expires_at = now() + interval '15 minutes', updated_at = now()
  where r.id = p_request_id and r.status = 'processing' and r.lease_token = p_lease_token;
  if not found then
    raise exception 'La lease vencio durante la purga.' using errcode = '40001';
  end if;
  return v_counts;
end;
$function$;

create or replace function public.mark_account_deletion_auth_started(
  p_request_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.account_deletion_requests r
  set auth_delete_started_at = coalesce(r.auth_delete_started_at, now()),
      lease_expires_at = now() + interval '15 minutes', updated_at = now()
  where r.id = p_request_id and r.status = 'processing'
    and r.lease_token = p_lease_token and r.public_data_deleted_at is not null;
  return found;
end;
$function$;

create or replace function public.complete_account_deletion(
  p_request_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_request public.account_deletion_requests%rowtype;
begin
  select r.* into v_request
  from public.account_deletion_requests r
  where r.id = p_request_id and r.status = 'processing'
    and r.lease_token = p_lease_token and r.public_data_deleted_at is not null
    and r.auth_delete_started_at is not null
  for update;
  if not found then return false; end if;

  insert into public.account_deletion_receipts (
    request_id, account_role, requested_at, completed_at, processor_version,
    deleted_counts, storage_objects_deleted
  ) values (
    v_request.id, v_request.account_role, v_request.requested_at, now(),
    '2026-11-16-v1', v_request.deleted_counts, v_request.storage_objects_deleted
  ) on conflict (request_id) do nothing;

  update public.account_deletion_requests r
  set user_id = null, subject_user_id = null, subject_student_id = null, email = null,
      status = 'completed', completed_at = now(), next_attempt_at = null,
      processing_started_at = null, lease_token = null, lease_expires_at = null,
      blocked_reason = null, last_error_code = null, last_error_at = null, updated_at = now()
  where r.id = p_request_id;
  return true;
end;
$function$;

create or replace function public.retry_account_deletion(
  p_request_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.account_deletion_requests r
  set status = case when r.attempt_count >= 8 then 'failed' else 'retry_wait' end,
      next_attempt_at = case when r.attempt_count >= 8 then null else now() + case
        when r.attempt_count <= 1 then interval '15 minutes'
        when r.attempt_count = 2 then interval '30 minutes'
        when r.attempt_count = 3 then interval '1 hour'
        when r.attempt_count = 4 then interval '2 hours'
        when r.attempt_count = 5 then interval '4 hours'
        else interval '6 hours' end end,
      last_error_code = left(coalesce(nullif(p_error_code, ''), 'unexpected_error'), 80),
      last_error_at = now(), processing_started_at = null,
      lease_token = null, lease_expires_at = null, updated_at = now()
  where r.id = p_request_id and r.status = 'processing' and r.lease_token = p_lease_token;
  return found;
end;
$function$;

create or replace function public.block_account_deletion(
  p_request_id uuid,
  p_lease_token uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.account_deletion_requests r
  set status = 'needs_review',
      blocked_reason = left(coalesce(nullif(p_reason, ''), 'manual_review_required'), 80),
      next_attempt_at = null, processing_started_at = null,
      lease_token = null, lease_expires_at = null, updated_at = now()
  where r.id = p_request_id and r.status = 'processing' and r.lease_token = p_lease_token;
  return found;
end;
$function$;

create or replace function public.cancel_account_deletion_request(
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.account_deletion_requests r
  set status = 'cancelled',
      next_attempt_at = null,
      processing_started_at = null,
      lease_token = null,
      lease_expires_at = null,
      blocked_reason = null,
      last_error_code = null,
      last_error_at = null,
      updated_at = now()
  where r.id = p_request_id
    and r.status in ('pending', 'needs_review')
    and r.storage_deleted_at is null
    and r.public_data_deleted_at is null
    and r.auth_delete_started_at is null;
  return found;
end;
$function$;

-- Reanuda una solicitud que soporte ya reviso o cuya causa transitoria fue
-- resuelta. Conserva los checkpoints para que el procesador continue de forma
-- idempotente, pero reinicia el contador de reintentos.
create or replace function public.resume_account_deletion_request(
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.account_deletion_requests r
  set status = 'pending',
      processor_schema_version = '2026-11-17-v1',
      scheduled_for = least(r.scheduled_for, now()),
      next_attempt_at = now(),
      attempt_count = 0,
      processing_started_at = null,
      lease_token = null,
      lease_expires_at = null,
      blocked_reason = null,
      last_error_code = null,
      last_error_at = null,
      updated_at = now()
  where r.id = p_request_id
    and r.status in ('needs_review', 'failed', 'retry_wait')
    and r.subject_user_id is not null
    and r.completed_at is null;
  return found;
end;
$function$;

revoke all on function public.request_own_account_deletion() from public, anon;
grant execute on function public.request_own_account_deletion() to authenticated;

revoke all on function public.claim_due_account_deletion() from public, anon, authenticated;
revoke all on function public.mark_account_deletion_storage_deleted(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.preflight_account_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.purge_account_public_data(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_account_deletion_auth_started(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_account_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.retry_account_deletion(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.block_account_deletion(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_account_deletion_request(uuid) from public, anon, authenticated;
revoke all on function public.resume_account_deletion_request(uuid) from public, anon, authenticated;

grant execute on function public.claim_due_account_deletion() to service_role;
grant execute on function public.mark_account_deletion_storage_deleted(uuid, uuid, integer) to service_role;
grant execute on function public.preflight_account_deletion(uuid, uuid) to service_role;
grant execute on function public.purge_account_public_data(uuid, uuid) to service_role;
grant execute on function public.mark_account_deletion_auth_started(uuid, uuid) to service_role;
grant execute on function public.complete_account_deletion(uuid, uuid) to service_role;
grant execute on function public.retry_account_deletion(uuid, uuid, text) to service_role;
grant execute on function public.block_account_deletion(uuid, uuid, text) to service_role;
grant execute on function public.cancel_account_deletion_request(uuid) to service_role;
grant execute on function public.resume_account_deletion_request(uuid) to service_role;

commit;

-- Verificacion segura (no borra nada):
select
  to_regprocedure('public.request_own_account_deletion()') is not null as request_rpc,
  to_regprocedure('public.claim_due_account_deletion()') is not null as claim_rpc,
  to_regprocedure('public.purge_account_public_data(uuid,uuid)') is not null as purge_rpc,
  to_regclass('public.account_deletion_receipts') is not null as receipts_table;
