-- ============================================================================
-- Progrezzia - check-in semanal del alumno
--
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar el codigo.
-- Idempotente. No elimina datos existentes.
-- ============================================================================

begin;

alter table if exists public.student_follow_ups
  drop constraint if exists student_follow_ups_alert_type_check;
alter table if exists public.student_follow_ups
  add constraint student_follow_ups_alert_type_check
  check (alert_type in ('inactive', 'no_routine', 'new_student', 'unfinished_session', 'program_ending', 'weekly_checkin'));

create table if not exists public.student_weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  week_start date not null,
  energy smallint not null check (energy between 1 and 5),
  sleep_quality smallint not null check (sleep_quality between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  training_difficulty smallint not null check (training_difficulty between 1 and 5),
  had_pain boolean not null default false,
  pain_details text check (pain_details is null or char_length(pain_details) <= 1000),
  body_weight numeric(6,2) check (body_weight is null or body_weight between 20 and 400),
  waist_cm numeric(6,2) check (waist_cm is null or waist_cm between 30 and 300),
  comment text check (comment is null or char_length(comment) <= 2000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, week_start)
);

create index if not exists student_weekly_checkins_trainer_review_idx
  on public.student_weekly_checkins (trainer_id, reviewed_at, week_start desc);
create index if not exists student_weekly_checkins_student_week_idx
  on public.student_weekly_checkins (student_id, week_start desc);

alter table public.student_weekly_checkins enable row level security;

drop policy if exists student_weekly_checkins_select_participants on public.student_weekly_checkins;
create policy student_weekly_checkins_select_participants
on public.student_weekly_checkins for select to authenticated
using (
  trainer_id = auth.uid()
  or student_id = public.auth_student_id()
);

drop policy if exists student_weekly_checkins_insert_student on public.student_weekly_checkins;
drop policy if exists student_weekly_checkins_update_student on public.student_weekly_checkins;

-- Las altas y modificaciones pasan por una función controlada. De esta forma
-- el alumno no puede alterar student_id, trainer_id o reviewed_at desde la API.
create or replace function public.upsert_weekly_checkin(
  p_week_start date,
  p_energy smallint,
  p_sleep_quality smallint,
  p_stress smallint,
  p_training_difficulty smallint,
  p_had_pain boolean,
  p_pain_details text,
  p_body_weight numeric,
  p_waist_cm numeric,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_student_id uuid := public.auth_student_id();
  v_trainer_id uuid;
  v_checkin_id uuid;
begin
  if auth.uid() is null or v_student_id is null then
    raise exception 'No autenticado como alumno.';
  end if;

  if p_energy not between 1 and 5
    or p_sleep_quality not between 1 and 5
    or p_stress not between 1 and 5
    or p_training_difficulty not between 1 and 5 then
    raise exception 'Valores de check-in inválidos.';
  end if;

  if p_had_pain and nullif(btrim(coalesce(p_pain_details, '')), '') is null then
    raise exception 'Falta describir la molestia.';
  end if;

  select s.trainer_id into v_trainer_id
  from public.students s
  where s.id = v_student_id;

  if v_trainer_id is null then
    raise exception 'Alumno sin entrenador.';
  end if;

  insert into public.student_weekly_checkins (
    trainer_id, student_id, week_start, energy, sleep_quality, stress,
    training_difficulty, had_pain, pain_details, body_weight, waist_cm,
    comment, reviewed_at
  ) values (
    v_trainer_id, v_student_id, p_week_start, p_energy, p_sleep_quality,
    p_stress, p_training_difficulty, p_had_pain,
    case when p_had_pain then nullif(btrim(p_pain_details), '') else null end,
    p_body_weight, p_waist_cm, nullif(btrim(p_comment), ''), null
  )
  on conflict (student_id, week_start) do update set
    energy = excluded.energy,
    sleep_quality = excluded.sleep_quality,
    stress = excluded.stress,
    training_difficulty = excluded.training_difficulty,
    had_pain = excluded.had_pain,
    pain_details = excluded.pain_details,
    body_weight = excluded.body_weight,
    waist_cm = excluded.waist_cm,
    comment = excluded.comment,
    reviewed_at = null
  returning id into v_checkin_id;

  return v_checkin_id;
end;
$$;

revoke all on function public.upsert_weekly_checkin(date, smallint, smallint, smallint, smallint, boolean, text, numeric, numeric, text) from public;
grant execute on function public.upsert_weekly_checkin(date, smallint, smallint, smallint, smallint, boolean, text, numeric, numeric, text) to authenticated;

create or replace function public.touch_student_weekly_checkin()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_student_weekly_checkin on public.student_weekly_checkins;
create trigger trg_touch_student_weekly_checkin
before update on public.student_weekly_checkins
for each row execute function public.touch_student_weekly_checkin();

create or replace function public.create_weekly_checkin_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_student_name text;
  v_requires_attention boolean;
begin
  select btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
  into v_student_name
  from public.students s
  where s.id = new.student_id;

  v_requires_attention := new.had_pain
    or new.energy <= 2
    or new.sleep_quality <= 2
    or new.stress >= 4
    or new.training_difficulty >= 5;

  delete from public.internal_notifications
  where recipient_user_id = new.trainer_id
    and type = 'weekly_checkin'
    and entity_type = 'weekly_checkin'
    and entity_id = new.id
    and read_at is null;

  insert into public.internal_notifications (
    recipient_user_id,
    type,
    title,
    body,
    href,
    entity_type,
    entity_id
  ) values (
    new.trainer_id,
    'weekly_checkin',
    case when v_requires_attention then 'Check-in que requiere atención' else 'Nuevo check-in semanal' end,
    case
      when new.had_pain then v_student_name || ' informó dolor o una molestia.'
      when new.energy <= 2 then v_student_name || ' informó energía baja.'
      when new.sleep_quality <= 2 then v_student_name || ' informó descanso bajo.'
      when new.stress >= 4 then v_student_name || ' informó estrés alto.'
      else v_student_name || ' completó su control semanal.'
    end,
    '/dashboard/messages?student=' || new.student_id::text,
    'weekly_checkin',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_create_weekly_checkin_notification on public.student_weekly_checkins;
create trigger trg_create_weekly_checkin_notification
after insert or update of energy, sleep_quality, stress, training_difficulty,
  had_pain, pain_details, body_weight, waist_cm, comment
on public.student_weekly_checkins
for each row execute function public.create_weekly_checkin_notification();

create or replace function public.mark_weekly_checkin_reviewed(p_checkin_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_caller uuid := auth.uid();
  v_updated integer := 0;
begin
  if v_caller is null then
    raise exception 'No autenticado.';
  end if;

  update public.student_weekly_checkins
  set reviewed_at = now()
  where id = p_checkin_id
    and trainer_id = v_caller;

  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    update public.internal_notifications
    set read_at = now()
    where recipient_user_id = v_caller
      and type = 'weekly_checkin'
      and entity_type = 'weekly_checkin'
      and entity_id = p_checkin_id
      and read_at is null;
  end if;

  return v_updated > 0;
end;
$$;

revoke all on function public.mark_weekly_checkin_reviewed(uuid) from public;
grant execute on function public.mark_weekly_checkin_reviewed(uuid) to authenticated;

commit;
