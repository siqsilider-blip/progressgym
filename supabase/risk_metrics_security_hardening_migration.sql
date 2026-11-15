-- Progrezzia - endurecimiento de seguridad de métricas de riesgo
--
-- Esta migración no modifica datos. Refuerza la validación de ownership,
-- limita la RPC al rol authenticated y fija un search_path explícito para
-- reducir el riesgo propio de SECURITY DEFINER. Es segura para volver a
-- ejecutar.

begin;

do $migration$
declare
  function_body text;
  original_body text;
begin
  select p.prosrc
  into function_body
  from pg_proc p
  where p.oid = to_regprocedure('public.get_students_risk_metrics(uuid[])');

  if function_body is null then
    raise exception
      'No existe public.get_students_risk_metrics(uuid[]). Aplicar primero la migración que crea la función.';
  end if;

  if position(
    's.trainer_id is distinct from auth.uid()' in lower(function_body)
  ) = 0 then
    if position('s.trainer_id <> auth.uid()' in function_body) = 0 then
      raise exception
        'La validación de ownership de get_students_risk_metrics no coincide con la versión auditada.';
    end if;

    function_body := replace(
      function_body,
      's.trainer_id <> auth.uid()',
      's.trainer_id is distinct from auth.uid()'
    );
  end if;

  if position('if auth.uid() is null then' in lower(function_body)) = 0 then
    original_body := function_body;
    function_body := replace(
      function_body,
      E'#variable_conflict use_column\nbegin',
      E'#variable_conflict use_column\nbegin\n\n  if auth.uid() is null then\n    raise exception ''No autenticado'';\n  end if;'
    );

    if function_body = original_body then
      function_body := regexp_replace(
        function_body,
        '^[[:space:]]*begin',
        E'begin\n\n  if auth.uid() is null then\n    raise exception ''No autenticado'';\n  end if;',
        'i'
      );
    end if;

    if function_body = original_body then
      raise exception
        'No se pudo localizar de forma segura el inicio de get_students_risk_metrics.';
    end if;
  end if;

  execute format(
    $definition$
    create or replace function public.get_students_risk_metrics(p_student_ids uuid[])
    returns table(
      student_id uuid,
      last_workout_at date,
      total_sessions integer,
      adherence_rate numeric,
      stagnant_days integer,
      progress_count integer
    )
    language plpgsql
    security definer
    set search_path to pg_catalog, public
    as %L
    $definition$,
    function_body
  );
end;
$migration$;

alter function public.get_students_risk_metrics(uuid[])
  set search_path = pg_catalog, public;

revoke all on function public.get_students_risk_metrics(uuid[]) from public;
revoke all on function public.get_students_risk_metrics(uuid[]) from anon;
grant execute on function public.get_students_risk_metrics(uuid[]) to authenticated;

commit;

-- Verificación: PUBLIC y anon deben quedar en false; authenticated, en true.
select
  exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(
      coalesce(p.proacl, acldefault('f', p.proowner))
    ) acl
    where p.oid = 'public.get_students_risk_metrics(uuid[])'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) as public_can_execute,
  has_function_privilege(
    'anon',
    'public.get_students_risk_metrics(uuid[])',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.get_students_risk_metrics(uuid[])',
    'EXECUTE'
  ) as authenticated_can_execute;
