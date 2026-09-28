-- ============================================================================
-- Progrezzia - fotos privadas de progreso y consentimiento de marketing
--
-- Ejecutar manualmente en Supabase SQL Editor antes de desplegar el codigo.
-- Idempotente. Crea un bucket PRIVADO con limite de 8 MB por imagen.
-- ============================================================================

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'progress-photos',
  'progress-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.student_progress_photos (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  weekly_checkin_id uuid references public.student_weekly_checkins(id) on delete set null,
  storage_path text not null unique,
  captured_on date not null,
  pose text not null default 'front'
    check (pose in ('front', 'side', 'back')),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_version text,
  marketing_consent_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_progress_photos_student_date_idx
  on public.student_progress_photos (student_id, captured_on desc);
create index if not exists student_progress_photos_trainer_date_idx
  on public.student_progress_photos (trainer_id, captured_on desc);
create index if not exists student_progress_photos_marketing_idx
  on public.student_progress_photos (trainer_id, marketing_consent, captured_on desc);

alter table public.student_progress_photos enable row level security;

revoke all on table public.student_progress_photos from anon;
revoke insert, update, delete on table public.student_progress_photos from authenticated;
grant select on table public.student_progress_photos to authenticated;

drop policy if exists student_progress_photos_select_participants
  on public.student_progress_photos;
create policy student_progress_photos_select_participants
on public.student_progress_photos
for select to authenticated
using (
  trainer_id = auth.uid()
  or student_id = public.auth_student_id()
);

-- Storage: el primer segmento de la ruta es siempre el auth.uid() del alumno.
drop policy if exists progress_photos_student_insert on storage.objects;
create policy progress_photos_student_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.auth_student_id() is not null
  and right(lower(name), 4) = '.jpg'
  and (
    select count(*)
    from public.student_progress_photos p
    where p.student_id = public.auth_student_id()
  ) < 60
);

drop policy if exists progress_photos_participants_select on storage.objects;
create policy progress_photos_participants_select
on storage.objects
for select to authenticated
using (
  bucket_id = 'progress-photos'
  and (
    owner_id = auth.uid()::text
    or exists (
      select 1
      from public.student_progress_photos p
      where p.storage_path = storage.objects.name
        and p.trainer_id = auth.uid()
    )
  )
);

drop policy if exists progress_photos_student_delete on storage.objects;
create policy progress_photos_student_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'progress-photos'
  and owner_id = auth.uid()::text
);

create or replace function public.register_progress_photo(
  p_weekly_checkin_id uuid,
  p_storage_path text,
  p_captured_on date,
  p_pose text,
  p_marketing_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_student_id uuid := public.auth_student_id();
  v_trainer_id uuid;
  v_photo_id uuid;
begin
  if v_user_id is null or v_student_id is null then
    raise exception 'No autenticado como alumno.';
  end if;

  if p_pose not in ('front', 'side', 'back') then
    raise exception 'Posición de foto inválida.';
  end if;

  if split_part(p_storage_path, '/', 1) <> v_user_id::text then
    raise exception 'Ruta de imagen inválida.';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'progress-photos'
      and o.name = p_storage_path
      and o.owner_id = v_user_id::text
  ) then
    raise exception 'La imagen no fue encontrada.';
  end if;

  if p_weekly_checkin_id is not null and not exists (
    select 1
    from public.student_weekly_checkins c
    where c.id = p_weekly_checkin_id
      and c.student_id = v_student_id
  ) then
    raise exception 'Check-in inválido.';
  end if;

  select s.trainer_id into v_trainer_id
  from public.students s
  where s.id = v_student_id;

  if v_trainer_id is null then
    raise exception 'Alumno sin entrenador.';
  end if;

  if (
    select count(*)
    from public.student_progress_photos p
    where p.student_id = v_student_id
  ) >= 60 then
    raise exception 'Se alcanzó el máximo de fotos de progreso.';
  end if;

  insert into public.student_progress_photos (
    trainer_id,
    student_id,
    weekly_checkin_id,
    storage_path,
    captured_on,
    pose,
    marketing_consent,
    marketing_consent_at,
    marketing_consent_version
  ) values (
    v_trainer_id,
    v_student_id,
    p_weekly_checkin_id,
    p_storage_path,
    p_captured_on,
    p_pose,
    coalesce(p_marketing_consent, false),
    case when p_marketing_consent then now() else null end,
    case when p_marketing_consent then '2026-09-27-v1' else null end
  )
  returning id into v_photo_id;

  return v_photo_id;
end;
$$;

revoke all on function public.register_progress_photo(uuid, text, date, text, boolean) from public;
grant execute on function public.register_progress_photo(uuid, text, date, text, boolean) to authenticated;

create or replace function public.set_progress_photo_marketing_consent(
  p_photo_id uuid,
  p_allowed boolean
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_student_id uuid := public.auth_student_id();
  v_updated integer := 0;
begin
  if auth.uid() is null or v_student_id is null then
    raise exception 'No autenticado como alumno.';
  end if;

  update public.student_progress_photos
  set
    marketing_consent = coalesce(p_allowed, false),
    marketing_consent_at = case when p_allowed then now() else marketing_consent_at end,
    marketing_consent_version = case when p_allowed then '2026-09-27-v1' else marketing_consent_version end,
    marketing_consent_revoked_at = case when p_allowed then null else now() end,
    updated_at = now()
  where id = p_photo_id
    and student_id = v_student_id;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.set_progress_photo_marketing_consent(uuid, boolean) from public;
grant execute on function public.set_progress_photo_marketing_consent(uuid, boolean) to authenticated;

create or replace function public.delete_progress_photo_record(p_photo_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_student_id uuid := public.auth_student_id();
  v_deleted integer := 0;
begin
  if auth.uid() is null or v_student_id is null then
    raise exception 'No autenticado como alumno.';
  end if;

  delete from public.student_progress_photos
  where id = p_photo_id
    and student_id = v_student_id;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.delete_progress_photo_record(uuid) from public;
grant execute on function public.delete_progress_photo_record(uuid) to authenticated;

commit;
