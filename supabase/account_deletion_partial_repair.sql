-- ============================================================================
-- Progrezzia - reparacion de migracion parcial de eliminacion de cuentas
-- Usar solamente cuando existen id/claim/receipts pero falta
-- processor_schema_version.
-- No elimina cuentas ni datos. Cuarentena solicitudes anteriores.
-- ============================================================================

begin;

alter table public.account_deletion_requests
  add column if not exists processor_schema_version text;

-- Toda solicitud que ya estaba en la tabla antes de esta reparacion se trata
-- como legacy y requiere confirmacion manual antes de poder ser reclamada.
update public.account_deletion_requests
set processor_schema_version = 'legacy-v0'
where processor_schema_version is null;

alter table public.account_deletion_requests
  alter column processor_schema_version set default '2026-11-17-v1';

alter table public.account_deletion_requests
  alter column processor_schema_version set not null;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in (
    'pending', 'processing', 'retry_wait', 'needs_review',
    'failed', 'cancelled', 'completed'
  ));

update public.account_deletion_requests
set status = 'needs_review',
    blocked_reason = 'legacy_request_requires_confirmation',
    next_attempt_at = null,
    processing_started_at = null,
    lease_token = null,
    lease_expires_at = null,
    updated_at = now()
where processor_schema_version = 'legacy-v0'
  and status in ('pending', 'processing', 'retry_wait');

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

  select u.email into v_email
  from auth.users u
  where u.id = v_user_id;

  select p.role, p.student_id into v_role, v_student_id
  from public.profiles p
  where p.id = v_user_id;

  if v_role is null or v_role not in ('student', 'trainer') then
    raise exception 'La cuenta no tiene un rol valido para solicitar la eliminacion.';
  end if;

  if v_role = 'student' and v_student_id is null then
    raise exception 'La cuenta de alumno no esta vinculada a una ficha.';
  end if;

  insert into public.account_deletion_requests (
    user_id,
    subject_user_id,
    subject_student_id,
    email,
    account_role,
    processor_schema_version,
    status,
    requested_at,
    scheduled_for,
    next_attempt_at,
    completed_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    v_student_id,
    v_email,
    v_role,
    '2026-11-17-v1',
    'pending',
    now(),
    now() + interval '7 days',
    now() + interval '7 days',
    null,
    now()
  )
  on conflict (user_id) do update set
    subject_user_id = excluded.subject_user_id,
    subject_student_id = excluded.subject_student_id,
    email = excluded.email,
    account_role = excluded.account_role,
    processor_schema_version = case
      when account_deletion_requests.status = 'cancelled'
        then '2026-11-17-v1'
      else account_deletion_requests.processor_schema_version
    end,
    status = case
      when account_deletion_requests.status = 'cancelled' then 'pending'
      else account_deletion_requests.status
    end,
    requested_at = case
      when account_deletion_requests.status = 'cancelled' then now()
      else account_deletion_requests.requested_at
    end,
    scheduled_for = case
      when account_deletion_requests.status = 'cancelled'
        then now() + interval '7 days'
      else account_deletion_requests.scheduled_for
    end,
    next_attempt_at = case
      when account_deletion_requests.status = 'cancelled'
        then now() + interval '7 days'
      else account_deletion_requests.next_attempt_at
    end,
    blocked_reason = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.blocked_reason
    end,
    last_error_code = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.last_error_code
    end,
    last_error_at = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.last_error_at
    end,
    attempt_count = case
      when account_deletion_requests.status = 'cancelled' then 0
      else account_deletion_requests.attempt_count
    end,
    processing_started_at = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.processing_started_at
    end,
    lease_token = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.lease_token
    end,
    lease_expires_at = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.lease_expires_at
    end,
    storage_deleted_at = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.storage_deleted_at
    end,
    storage_objects_deleted = case
      when account_deletion_requests.status = 'cancelled' then 0
      else account_deletion_requests.storage_objects_deleted
    end,
    public_data_deleted_at = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.public_data_deleted_at
    end,
    deleted_counts = case
      when account_deletion_requests.status = 'cancelled' then '{}'::jsonb
      else account_deletion_requests.deleted_counts
    end,
    auth_delete_started_at = case
      when account_deletion_requests.status = 'cancelled' then null
      else account_deletion_requests.auth_delete_started_at
    end,
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
      (
        r.status in ('pending', 'retry_wait')
        and coalesce(r.next_attempt_at, r.scheduled_for) <= now()
      )
      or (
        r.status = 'processing'
        and coalesce(
          r.lease_expires_at,
          r.processing_started_at,
          r.updated_at
        ) < now() - interval '5 minutes'
      )
    )
  order by r.scheduled_for, r.requested_at
  for update skip locked
  limit 1;

  if v_request_id is null then
    return;
  end if;

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
  returning
    r.id,
    r.subject_user_id,
    r.account_role,
    r.subject_student_id,
    r.lease_token,
    r.storage_deleted_at,
    r.public_data_deleted_at,
    r.auth_delete_started_at,
    r.attempt_count;
end;
$function$;

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

revoke all on function public.request_own_account_deletion()
  from public, anon;
grant execute on function public.request_own_account_deletion()
  to authenticated;

revoke all on function public.claim_due_account_deletion()
  from public, anon, authenticated;
revoke all on function public.resume_account_deletion_request(uuid)
  from public, anon, authenticated;

grant execute on function public.claim_due_account_deletion()
  to service_role;
grant execute on function public.resume_account_deletion_request(uuid)
  to service_role;

commit;

select
  exists (
    select 1
    from pg_attribute
    where attrelid = 'public.account_deletion_requests'::regclass
      and attname = 'processor_schema_version'
      and not attisdropped
  ) as version_column_exists,
  count(*) filter (
    where processor_schema_version = 'legacy-v0'
      and status in ('pending', 'processing', 'retry_wait')
  ) as legacy_requests_still_claimable,
  count(*) filter (
    where processor_schema_version = 'legacy-v0'
      and status = 'needs_review'
  ) as legacy_requests_for_review,
  not has_function_privilege(
    'anon',
    'public.claim_due_account_deletion()',
    'EXECUTE'
  ) as claim_blocked_for_anon,
  not has_function_privilege(
    'authenticated',
    'public.claim_due_account_deletion()',
    'EXECUTE'
  ) as claim_blocked_for_authenticated,
  has_function_privilege(
    'service_role',
    'public.claim_due_account_deletion()',
    'EXECUTE'
  ) as service_role_can_claim,
  not has_function_privilege(
    'anon',
    'public.resume_account_deletion_request(uuid)',
    'EXECUTE'
  ) as resume_blocked_for_anon,
  not has_function_privilege(
    'authenticated',
    'public.resume_account_deletion_request(uuid)',
    'EXECUTE'
  ) as resume_blocked_for_authenticated,
  array_remove(array[
    case when to_regprocedure(
      'public.preflight_account_deletion(uuid,uuid)'
    ) is null then 'preflight_account_deletion' end,
    case when to_regprocedure(
      'public.mark_account_deletion_storage_deleted(uuid,uuid,integer)'
    ) is null then 'mark_account_deletion_storage_deleted' end,
    case when to_regprocedure(
      'public.purge_account_public_data(uuid,uuid)'
    ) is null then 'purge_account_public_data' end,
    case when to_regprocedure(
      'public.mark_account_deletion_auth_started(uuid,uuid)'
    ) is null then 'mark_account_deletion_auth_started' end,
    case when to_regprocedure(
      'public.complete_account_deletion(uuid,uuid)'
    ) is null then 'complete_account_deletion' end,
    case when to_regprocedure(
      'public.retry_account_deletion(uuid,uuid,text)'
    ) is null then 'retry_account_deletion' end,
    case when to_regprocedure(
      'public.block_account_deletion(uuid,uuid,text)'
    ) is null then 'block_account_deletion' end
  ], null) as missing_worker_functions
from public.account_deletion_requests;
