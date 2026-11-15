# Auditoría segura de Supabase

La fuente de verdad de producción no puede reconstruirse únicamente desde la
service key de la aplicación. La auditoría debe ejecutarse dentro del SQL
Editor con permisos de administración.

## Procedimiento

1. Abrir el proyecto productivo correcto en Supabase.
2. Crear una consulta nueva.
3. Copiar completo `supabase/audit_production_read_only.sql`.
4. Seleccionar **No limit**.
5. Ejecutar y exportar cada resultado.
6. No aplicar una migración de corrección hasta comparar esos resultados con
   los SQL versionados del repositorio.

Si el bloque de presencia informa una tabla o RPC ausente, no interpretar los
bloques posteriores como una auditoría completa: algunas consultas dependen
del esquema actual y pueden detenerse al llegar al objeto faltante.

El script es de solo lectura: contiene únicamente consultas `select`. No
devuelve nombres, correos, teléfonos, mensajes ni fotografías; los chequeos de
integridad son conteos agregados.

## Resultado esperado

- Ninguna tabla con datos de alumnos aparece sin RLS.
- `anon` y `authenticated` no pueden crear objetos en el schema `public`.
- Todas las tablas runtime críticas aparecen como existentes.
- Las RPC `security definer` tienen un `search_path` fijo.
- `public_can_execute` y `anon_can_execute` son falsos salvo una excepción
  explícitamente documentada.
- Las vistas públicas declaran `security_invoker=true` o tienen una excepción
  revisada y documentada.
- Todas las RPC críticas aparecen como existentes.
- `obsolete_three_argument_overload_exists` es falso.
- Las dos defensas internas de `get_students_risk_metrics` son verdaderas.
- Las dos defensas de autorización de `save_workout_set_safe` son verdaderas.
- El bucket `progress-photos` figura como privado.
- Los seis conteos de integridad son cero.
- No existen índices inválidos o sin terminar.

## Qué no hacer

- No pegar automáticamente recomendaciones generadas a partir de un dump
  incompleto.
- No volver a ejecutar todas las migraciones históricas sobre producción.
- No ejecutar los SQL históricos en orden alfabético: varias RPC tienen
  definiciones sucesivas y una versión antigua puede degradar la actual.
- No corregir permisos de una RPC sin verificar primero su firma real.
- No compartir resultados que contengan credenciales o valores de variables
  de entorno.

## Orden de aplicación del parche actual

1. Ejecutar primero la auditoría de solo lectura.
2. Confirmar que las firmas reales coinciden con las esperadas.
3. Aplicar `risk_metrics_security_hardening_migration.sql`.
4. Aplicar `internal_notifications_read_security_migration.sql`.
5. Aplicar `workout_session_write_security_migration.sql`.
6. Recién entonces desplegar el código web que usa las nuevas RPC.
7. Probar avisos leídos, cierre completo, cierre incompleto, edición histórica,
   nota y evaluación post-entrenamiento.
8. Aplicar `internal_notifications_read_lockdown_migration.sql`.
9. Aplicar `workout_session_write_lockdown_migration.sql`.
10. Volver a ejecutar la auditoría y conservar el resultado como evidencia.
