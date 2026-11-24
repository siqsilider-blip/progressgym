-- ============================================================================
-- Progrezzia - videos privados de tecnica
--
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar el codigo.
-- Idempotente. Reserva el envio antes del upload para que Storage solo acepte
-- rutas autorizadas, limita el uso y prepara una retencion segura de 30 dias.
-- ============================================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'technique-videos',
  'technique-videos',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.technique_video_submissions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  workout_session_id uuid references public.workout_sessions(id) on delete set null,
  routine_day_exercise_id uuid references public.routine_day_exercises(id) on delete set null,
  storage_path text not null unique,
  mime_type text,
  file_size_bytes bigint,
  duration_seconds numeric(6, 2) not null,
  note text,
  status text not null default 'uploading',
  trainer_feedback text,
  reviewed_by uuid references public.trainers(id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  cleanup_claimed_at timestamptz,
  cleanup_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint technique_video_status_check
    check (status in ('uploading', 'pending', 'reviewed')),
  constraint technique_video_file_check
    check (
      (status = 'uploading' and mime_type is null and file_size_bytes is null)
      or (
        status in ('pending', 'reviewed')
        and mime_type in ('video/mp4', 'video/quicktime', 'video/webm')
        and file_size_bytes > 0 and file_size_bytes <= 52428800
      )
    ),
  constraint technique_video_duration_check
    check (duration_seconds > 0 and duration_seconds <= 30),
  constraint technique_video_note_check
    check (note is null or char_length(note) <= 500),
  constraint technique_video_feedback_check
    check (trainer_feedback is null or char_length(trainer_feedback) <= 2000),
  constraint technique_video_review_state_check
    check (
      (status in ('uploading', 'pending') and reviewed_at is null and reviewed_by is null)
      or
      (status = 'reviewed' and reviewed_at is not null and reviewed_by is not null
       and trainer_feedback is not null)
    )
);

create index if not exists technique_video_trainer_pending_idx
  on public.technique_video_submissions (trainer_id, created_at desc)
  where status = 'pending';
create index if not exists technique_video_student_created_idx
  on public.technique_video_submissions (student_id, created_at desc);
create index if not exists technique_video_expiry_idx
  on public.technique_video_submissions (expires_at, cleanup_claimed_at);

alter table public.technique_video_submissions enable row level security;
revoke all on table public.technique_video_submissions from public, anon;
revoke insert, update, delete on table public.technique_video_submissions from authenticated;
grant select on table public.technique_video_submissions to authenticated;

drop policy if exists technique_video_select_participants
  on public.technique_video_submissions;
create policy technique_video_select_participants
on public.technique_video_submissions for select to authenticated
using (trainer_id = auth.uid() or student_id = public.auth_student_id());

-- Storage solo admite una ruta que haya sido reservada antes mediante la RPC.
drop policy if exists technique_videos_student_insert on storage.objects;
create policy technique_videos_student_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'technique-videos'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.technique_video_submissions v
    where v.storage_path = storage.objects.name
      and v.student_id = public.auth_student_id()
      and v.status = 'uploading' and v.expires_at > now()
  )
);

drop policy if exists technique_videos_participants_select on storage.objects;
create policy technique_videos_participants_select
on storage.objects for select to authenticated
using (
  bucket_id = 'technique-videos'
  and (
    owner_id = auth.uid()::text
    or exists (
      select 1 from public.technique_video_submissions v
      where v.storage_path = storage.objects.name
        and v.trainer_id = auth.uid() and v.status in ('pending', 'reviewed')
    )
  )
);

drop policy if exists technique_videos_student_delete on storage.objects;
create policy technique_videos_student_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'technique-videos'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and (
    not exists (
      select 1 from public.technique_video_submissions v
      where v.storage_path = storage.objects.name
    )
    or exists (
      select 1 from public.technique_video_submissions v
      where v.storage_path = storage.objects.name
        and v.student_id = public.auth_student_id()
        and v.status = 'uploading'
    )
  )
);

-- Paso 1: reserva id/path. Exige una serie real del mismo ejercicio para que
-- la eleccion diaria ya haya quedado fijada por save_workout_set_safe.
create or replace function public.create_technique_video_submission(
  p_workout_session_id uuid,
  p_routine_day_exercise_id uuid,
  p_duration_seconds numeric,
  p_file_extension text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_student_id uuid := public.auth_student_id();
  v_trainer_id uuid;
  v_submission_id uuid := gen_random_uuid();
  v_storage_path text;
  v_week_start date;
  v_extension text := lower(btrim(coalesce(p_file_extension, '')));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_user_id is null or v_student_id is null then
    raise exception 'No autenticado como alumno.' using errcode = '42501';
  end if;
  if p_workout_session_id is null or p_routine_day_exercise_id is null then
    raise exception 'No pudimos identificar la sesion y el ejercicio.';
  end if;
  if p_duration_seconds is null or p_duration_seconds <= 0 or p_duration_seconds > 30 then
    raise exception 'El video debe durar hasta 30 segundos.';
  end if;
  if v_extension not in ('mp4', 'mov', 'webm') then
    raise exception 'El formato del video no esta permitido.';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'El comentario es demasiado largo.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_student_id::text || ':technique-video', 0)
  );

  select s.trainer_id into v_trainer_id
  from public.students s
  join public.workout_sessions ws
    on ws.id = p_workout_session_id and ws.student_id = s.id
   and ws.status in ('in_progress', 'completed')
  join public.routine_day_exercises rde
    on rde.id = p_routine_day_exercise_id
   and rde.routine_day_id = ws.routine_day_id
  where s.id = v_student_id
    and exists (
      select 1 from public.exercise_logs el
      where el.workout_session_id = ws.id
        and el.routine_day_exercise_id = rde.id and el.reps > 0
    );

  if v_trainer_id is null then
    raise exception 'Guarda primero una serie de este ejercicio para enviar el video.';
  end if;

  v_week_start := date_trunc(
    'week', now() at time zone 'America/Argentina/Buenos_Aires'
  )::date;
  if (
    select count(*) from public.technique_video_submissions v
    where v.student_id = v_student_id and v.status in ('pending', 'reviewed')
      and (v.created_at at time zone 'America/Argentina/Buenos_Aires')::date
          between v_week_start and v_week_start + 6
  ) >= 2 then
    raise exception 'Ya enviaste los dos videos de tecnica disponibles esta semana.';
  end if;
  if (
    select count(*) from public.technique_video_submissions v
    where v.student_id = v_student_id and v.status = 'uploading'
      and v.expires_at > now()
  ) >= 3 then
    raise exception 'Ya hay cargas de video en proceso. Reintenta en unos minutos.';
  end if;

  v_storage_path := v_user_id::text || '/' || v_submission_id::text || '.' || v_extension;
  insert into public.technique_video_submissions (
    id, trainer_id, student_id, workout_session_id, routine_day_exercise_id,
    storage_path, duration_seconds, note, status, expires_at
  ) values (
    v_submission_id, v_trainer_id, v_student_id, p_workout_session_id,
    p_routine_day_exercise_id, v_storage_path, p_duration_seconds, v_note,
    'uploading', now() + interval '1 hour'
  );

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'storage_path', v_storage_path
  );
end;
$function$;

-- Paso 2: valida el objeto real y recien entonces lo publica al entrenador.
create or replace function public.finalize_technique_video_submission(
  p_submission_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $function$
declare
  v_user_id uuid := auth.uid();
  v_student_id uuid := public.auth_student_id();
  v_submission public.technique_video_submissions%rowtype;
  v_file_size bigint;
  v_mime_type text;
  v_week_start date;
  v_student_name text;
  v_exercise_name text;
begin
  if v_user_id is null or v_student_id is null then
    raise exception 'No autenticado como alumno.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_student_id::text || ':technique-video', 0)
  );

  select v.* into v_submission
  from public.technique_video_submissions v
  where v.id = p_submission_id and v.student_id = v_student_id
    and v.status = 'uploading' and v.expires_at > now()
  for update;
  if not found then
    raise exception 'La carga de video ya no esta disponible.';
  end if;

  select
    case
      when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (o.metadata ->> 'size')::bigint
      else 0
    end,
    btrim(split_part(lower(coalesce(o.metadata ->> 'mimetype', '')), ';', 1))
  into v_file_size, v_mime_type
  from storage.objects o
  where o.bucket_id = 'technique-videos'
    and o.name = v_submission.storage_path
    and o.owner_id = v_user_id::text;

  if not found then
    raise exception 'El video no fue encontrado.';
  end if;
  if v_file_size <= 0 or v_file_size > 52428800 then
    raise exception 'El video supera el limite permitido.';
  end if;
  if v_mime_type not in ('video/mp4', 'video/quicktime', 'video/webm') then
    raise exception 'El formato del video no esta permitido.';
  end if;

  v_week_start := date_trunc(
    'week', now() at time zone 'America/Argentina/Buenos_Aires'
  )::date;
  if (
    select count(*) from public.technique_video_submissions v
    where v.student_id = v_student_id and v.id <> p_submission_id
      and v.status in ('pending', 'reviewed')
      and (v.created_at at time zone 'America/Argentina/Buenos_Aires')::date
          between v_week_start and v_week_start + 6
  ) >= 2 then
    raise exception 'Ya enviaste los dos videos de tecnica disponibles esta semana.';
  end if;

  update public.technique_video_submissions
  set mime_type = v_mime_type, file_size_bytes = v_file_size,
      status = 'pending', expires_at = now() + interval '30 days',
      updated_at = now()
  where id = p_submission_id;

  select
    nullif(btrim(concat_ws(' ', s.first_name, s.last_name)), ''),
    coalesce(e.name, 'Ejercicio')
  into v_student_name, v_exercise_name
  from public.technique_video_submissions v
  join public.students s on s.id = v.student_id
  left join public.routine_day_exercises rde on rde.id = v.routine_day_exercise_id
  left join public.exercises e on e.id = rde.exercise_id
  where v.id = p_submission_id;

  insert into public.internal_notifications (
    recipient_user_id, actor_user_id, type, title, body, href,
    entity_type, entity_id
  ) values (
    v_submission.trainer_id, v_user_id, 'technique_video_submitted',
    'Video de tecnica para revisar',
    coalesce(v_student_name, 'Una alumna') || ' envio un video de ' || v_exercise_name || '.',
    '/dashboard/technique-videos?video=' || p_submission_id::text,
    'technique_video', p_submission_id
  );

  return true;
end;
$function$;

-- El cliente solo puede cancelar una reserva que aun no fue publicada al
-- entrenador. Una vez pending, el video forma parte de la bandeja de revision.
create or replace function public.delete_technique_video_submission(
  p_submission_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $function$
declare
  v_student_id uuid := public.auth_student_id();
  v_storage_path text;
  v_deleted integer := 0;
begin
  if auth.uid() is null or v_student_id is null then
    raise exception 'No autenticado como alumno.' using errcode = '42501';
  end if;

  select v.storage_path into v_storage_path
  from public.technique_video_submissions v
  where v.id = p_submission_id and v.student_id = v_student_id
    and v.status = 'uploading'
  for update;
  if not found then
    return false;
  end if;

  -- La metadata solo se borra una vez que Storage confirma que el objeto ya no
  -- existe. Asi un cliente no puede dejar archivos huerfanos deliberadamente.
  if exists (
    select 1 from storage.objects o
    where o.bucket_id = 'technique-videos' and o.name = v_storage_path
  ) then
    raise exception 'Elimina primero el archivo de video.';
  end if;

  delete from public.internal_notifications n
  where n.entity_type = 'technique_video' and n.entity_id = p_submission_id;

  delete from public.technique_video_submissions v
  where v.id = p_submission_id and v.student_id = v_student_id
    and v.status = 'uploading';
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$function$;

-- La devolucion queda en la ficha del video y tambien como mensaje vinculado
-- al ejercicio/sesion. El trigger de coaching_messages genera el aviso.
create or replace function public.mark_technique_video_reviewed(
  p_submission_id uuid,
  p_feedback text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_trainer_id uuid := auth.uid();
  v_submission public.technique_video_submissions%rowtype;
  v_feedback text := nullif(btrim(coalesce(p_feedback, '')), '');
  v_conversation_id uuid;
begin
  if v_trainer_id is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;
  if v_feedback is null then
    raise exception 'Escribi la devolucion para la alumna.';
  end if;
  if char_length(v_feedback) > 2000 then
    raise exception 'La devolucion es demasiado larga.';
  end if;

  select v.* into v_submission
  from public.technique_video_submissions v
  where v.id = p_submission_id and v.trainer_id = v_trainer_id
    and v.status in ('pending', 'reviewed')
  for update;
  if not found then
    raise exception 'Video no encontrado o no autorizado.' using errcode = '42501';
  end if;

  update public.technique_video_submissions
  set status = 'reviewed', trainer_feedback = v_feedback,
      reviewed_by = v_trainer_id, reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now()
  where id = p_submission_id;

  update public.internal_notifications n
  set read_at = coalesce(n.read_at, now())
  where n.recipient_user_id = v_trainer_id
    and n.type = 'technique_video_submitted'
    and n.entity_type = 'technique_video'
    and n.entity_id = p_submission_id;

  -- Solo el primer review crea el mensaje. Las ediciones posteriores actualizan
  -- la ficha sin duplicar conversaciones ni notificaciones.
  if v_submission.status = 'pending' then
    insert into public.coaching_conversations (
      trainer_id, student_id, status, last_message_at, updated_at
    ) values (
      v_trainer_id, v_submission.student_id, 'active', now(), now()
    )
    on conflict (trainer_id, student_id) do update
      set status = 'active', last_message_at = now(), updated_at = now()
    returning id into v_conversation_id;

    insert into public.coaching_messages (
      conversation_id, sender_user_id, sender_role, topic, body,
      routine_day_exercise_id, workout_session_id
    ) values (
      v_conversation_id, v_trainer_id, 'trainer', 'technique', v_feedback,
      v_submission.routine_day_exercise_id, v_submission.workout_session_id
    );
  end if;

  return true;
end;
$function$;

-- Un cambio de entrenador conserva el acceso del entrenador actual y mueve
-- los avisos pendientes para que el video no quede asignado al anterior.
create or replace function public.sync_technique_video_trainer()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.trainer_id is not distinct from old.trainer_id then return new; end if;

  update public.technique_video_submissions v
  set trainer_id = new.trainer_id, updated_at = now()
  where v.student_id = new.id;

  update public.internal_notifications n
  set recipient_user_id = new.trainer_id
  where n.type = 'technique_video_submitted' and n.read_at is null
    and n.entity_type = 'technique_video'
    and n.entity_id in (
      select v.id from public.technique_video_submissions v
      where v.student_id = new.id
    );
  return new;
end;
$function$;

drop trigger if exists trg_sync_technique_video_trainer on public.students;
create trigger trg_sync_technique_video_trainer
after update of trainer_id on public.students
for each row execute function public.sync_technique_video_trainer();

-- El worker reclama filas vencidas, elimina los objetos mediante Storage API
-- y recien entonces borra metadata. Nunca elimina objetos directamente por SQL.
create or replace function public.claim_expired_technique_videos(
  p_limit integer default 100
)
returns table(submission_id uuid, storage_path text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  return query
  with candidates as (
    select v.id from public.technique_video_submissions v
    where v.expires_at <= now()
      and (v.cleanup_claimed_at is null
           or v.cleanup_claimed_at < now() - interval '15 minutes')
    order by v.expires_at, v.id
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update skip locked
  ), claimed as (
    update public.technique_video_submissions v
    set cleanup_claimed_at = now(), cleanup_attempts = cleanup_attempts + 1,
        updated_at = now()
    from candidates c where v.id = c.id
    returning v.id, v.storage_path
  )
  select c.id, c.storage_path from claimed c;
end;
$function$;

create or replace function public.finalize_technique_video_cleanup(
  p_submission_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare v_deleted integer := 0;
begin
  delete from public.internal_notifications n
  where n.entity_type = 'technique_video' and n.entity_id = p_submission_id;
  delete from public.technique_video_submissions v
  where v.id = p_submission_id and v.cleanup_claimed_at is not null;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$function$;

create or replace function public.release_technique_video_cleanup(
  p_submission_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare v_updated integer := 0;
begin
  update public.technique_video_submissions v
  set cleanup_claimed_at = null, updated_at = now()
  where v.id = p_submission_id and v.cleanup_claimed_at is not null;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$function$;

revoke all on function public.create_technique_video_submission(uuid, uuid, numeric, text, text)
  from public, anon;
grant execute on function public.create_technique_video_submission(uuid, uuid, numeric, text, text)
  to authenticated;
revoke all on function public.finalize_technique_video_submission(uuid)
  from public, anon;
grant execute on function public.finalize_technique_video_submission(uuid)
  to authenticated;
revoke all on function public.delete_technique_video_submission(uuid)
  from public, anon;
grant execute on function public.delete_technique_video_submission(uuid)
  to authenticated;
revoke all on function public.mark_technique_video_reviewed(uuid, text)
  from public, anon;
grant execute on function public.mark_technique_video_reviewed(uuid, text)
  to authenticated;
revoke all on function public.sync_technique_video_trainer()
  from public, anon, authenticated;

revoke all on function public.claim_expired_technique_videos(integer)
  from public, anon, authenticated;
revoke all on function public.finalize_technique_video_cleanup(uuid)
  from public, anon, authenticated;
revoke all on function public.release_technique_video_cleanup(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_expired_technique_videos(integer) to service_role;
grant execute on function public.finalize_technique_video_cleanup(uuid) to service_role;
grant execute on function public.release_technique_video_cleanup(uuid) to service_role;

commit;

-- Verificacion esperada: true, true, false, false, false.
select
  to_regclass('public.technique_video_submissions') is not null as table_created,
  exists (
    select 1 from storage.buckets b
    where b.id = 'technique-videos' and b.public = false
  ) as private_bucket_created,
  has_table_privilege('anon', 'public.technique_video_submissions', 'SELECT') as anon_can_read,
  has_function_privilege(
    'anon',
    'public.create_technique_video_submission(uuid,uuid,numeric,text,text)',
    'EXECUTE'
  ) as anon_can_create,
  has_function_privilege(
    'authenticated',
    'public.claim_expired_technique_videos(integer)',
    'EXECUTE'
  ) as clients_can_claim_cleanup;
