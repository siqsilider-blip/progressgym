-- Las duraciones previas siguen interpretándose en minutos.
-- Las nuevas versiones guardan su unidad sin convertir el plan ni los registros.
begin;
set local lock_timeout = '5s';

alter table public.exercises
    add column if not exists duration_unit text
        check (duration_unit is null or duration_unit in ('minutes', 'seconds'));

notify pgrst, 'reload schema';

commit;
