# Eliminación de cuentas — operación segura

Actualizado: 17 de noviembre de 2026.

## Activación

1. Ejecutar `supabase/account_deletion_processor_migration.sql` en Supabase SQL Editor.
   Las solicitudes pendientes del flujo anterior quedan en `needs_review` con
   motivo `legacy_request_requires_confirmation`; no se borran automáticamente.
2. Auditar esas solicitudes históricas. Cancelar las de prueba/no confirmadas y
   reanudar únicamente las que el titular realmente pidió eliminar.
3. Ejecutar `supabase/student_deactivation_migration.sql` para habilitar la baja
   no destructiva y transaccional desde el perfil del alumno.
4. Crear en Vercel la variable secreta `CRON_SECRET` para Production.
5. Desplegar `main`. Vercel registrará el cron diario definido en `vercel.json`.
6. Confirmar que una llamada sin `Authorization` a
   `/api/internal/account-deletions/process` devuelve `401`.

No guardar `CRON_SECRET` en Git ni exponerlo en variables `NEXT_PUBLIC_*`.

## Comportamiento

- La solicitud se programa para siete días después y repetirla no mueve la fecha.
- El worker toma como máximo diez solicitudes por ejecución con una lease exclusiva.
- Para alumnos elimina primero las fotos del bucket privado, después los datos
  públicos en una transacción, vuelve a comprobar Storage y finalmente elimina Auth.
- Un entrenador con alumnos o dependencias de terceros queda en `needs_review`;
  nunca se eliminan en cascada las cuentas personales de sus alumnos.
- Los fallos transitorios se reintentan con backoff y, después de ocho intentos,
  quedan en `failed` para revisión manual.
- Al completar se conserva solo un recibo técnico sin correo, nombre, Auth ID,
  Student ID ni rutas de imágenes.

## Cancelación por soporte

Antes de que comience cualquier limpieza, soporte puede cancelar de forma
auditable con `cancel_account_deletion_request(uuid)`, disponible únicamente
para `service_role`. También puede cancelar un caso en `needs_review` si ningún
checkpoint comenzó. No puede cancelarse una solicitud que ya eliminó archivos
o datos.

## Revisión y reanudación por soporte

Cuando una solicitud queda en `needs_review` o `failed`, primero se resuelve la
causa indicada en `blocked_reason` o `last_error_code`. Después puede reanudarse
sin perder los checkpoints ya completados:

```sql
select public.resume_account_deletion_request('ID-DE-LA-SOLICITUD'::uuid);
```

La función solo está disponible para `service_role`, vuelve a dejar la solicitud
lista para el worker y no restaura el acceso de la cuenta durante la baja.

## Monitoreo operativo

Hasta incorporar una alerta administrativa, revisar esta cola diariamente. La
consulta evita mostrar correo, nombre o identificadores de usuario:

```sql
select
  id as request_id,
  account_role,
  status,
  requested_at,
  scheduled_for,
  attempt_count,
  blocked_reason,
  last_error_code,
  last_error_at
from public.account_deletion_requests
where status in ('needs_review', 'failed')
order by coalesce(last_error_at, requested_at);
```

Cada fila debe investigarse y resolverse antes de usar
`resume_account_deletion_request`. Un entrenador con alumnos no se reanuda hasta
transferir o desvincular de forma segura todas sus dependencias.

## Validación

Las pruebas destructivas deben hacerse únicamente con cuentas descartables de
staging. Nunca adelantar `scheduled_for` de una cuenta real para probar el worker.

Casos mínimos:

1. Alumno descartable sin fotos.
2. Alumno descartable con frente, perfil y espalda.
3. Alumno con rutina, sesiones, mensajes y check-in.
4. Entrenador descartable sin alumnos.
5. Entrenador con alumno: debe quedar en `needs_review` sin borrar ningún dato.
6. Repetir el worker: no debe producir dobles borrados ni errores.
