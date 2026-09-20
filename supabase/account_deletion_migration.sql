-- ============================================================================
-- Progrezzia - solicitudes de eliminación de cuenta
-- Ejecutar manualmente una sola vez desde Supabase SQL Editor.
-- Registra la solicitud sin borrar automáticamente cuentas de terceros.
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

alter table public.account_deletion_requests enable row level security;

drop policy if exists "user_select_own_deletion_request" on public.account_deletion_requests;
create policy "user_select_own_deletion_request"
on public.account_deletion_requests
for select
to authenticated
using (user_id = auth.uid());

revoke all on public.account_deletion_requests from anon;
revoke insert, update, delete on public.account_deletion_requests from authenticated;
grant select on public.account_deletion_requests to authenticated;

create or replace function public.request_own_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
    v_role text;
    v_scheduled_for timestamptz := now() + interval '7 days';
begin
    if v_user_id is null then
        raise exception 'No autenticado' using errcode = '42501';
    end if;

    select au.email into v_email
      from auth.users au
     where au.id = v_user_id;

    select p.role into v_role
      from public.profiles p
     where p.id = v_user_id;

    insert into public.account_deletion_requests (
        user_id, email, account_role, status, requested_at, scheduled_for, completed_at, updated_at
    ) values (
        v_user_id, v_email, v_role, 'pending', now(), v_scheduled_for, null, now()
    )
    on conflict (user_id) do update set
        email = excluded.email,
        account_role = excluded.account_role,
        status = 'pending',
        requested_at = now(),
        scheduled_for = v_scheduled_for,
        completed_at = null,
        updated_at = now();

    return v_scheduled_for;
end;
$$;

revoke all on function public.request_own_account_deletion() from public;
revoke all on function public.request_own_account_deletion() from anon;
grant execute on function public.request_own_account_deletion() to authenticated;

commit;

-- Verificación (debe devolver true):
-- select to_regprocedure('public.request_own_account_deletion()') is not null as funcion_creada;
