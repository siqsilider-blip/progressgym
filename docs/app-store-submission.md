# Progrezzia — preparación para App Store

Actualizado: 20 de septiembre de 2026.

## Ficha propuesta

- Nombre: **Progrezzia**
- Subtítulo: **Entrenamiento y progreso**
- Categoría principal: **Salud y fitness**
- Categoría secundaria: **Productividad**
- Idioma principal: **Español (Argentina)**
- URL de soporte: `https://progressgym-sigma.vercel.app/support`
- URL de privacidad: `https://progressgym-sigma.vercel.app/privacy`
- URL de opciones de privacidad: `https://progressgym-sigma.vercel.app/account-deletion`

### Descripción breve

Progrezzia conecta a entrenadores y alumnos en un mismo lugar. Creá y asigná rutinas, registrá cada serie, consultá el historial y acompañá el progreso desde el celular.

El entrenador puede organizar alumnos, semanas, días y bloques de entrenamiento. El alumno recibe un programa claro, accede a videos de técnica y registra peso, repeticiones y esfuerzo durante la sesión.

### Palabras clave propuestas

`entrenamiento,rutinas,gimnasio,progreso,entrenador,fuerza,ejercicios,fitness,series`

## Privacidad declarada

La declaración final en App Store Connect debe coincidir con la versión enviada y con los proveedores configurados en producción.

- Datos de contacto: nombre, correo electrónico y teléfono opcional.
- Identificadores: identificador interno de usuario.
- Salud y fitness: rutinas, ejercicios, series, peso, repeticiones, RPE e historial de entrenamiento.
- Contenido del usuario: notas del entrenador o de la sesión, cuando existan.
- No se venden datos.
- No se usan datos para publicidad.
- No se realiza seguimiento entre aplicaciones o sitios de terceros.
- Proveedores actuales: Supabase (autenticación y base de datos) y Vercel (alojamiento y entrega).

Antes de completar la ficha, revisar si se incorporó analítica, reporte de errores, notificaciones u otro SDK nuevo.

## Información para revisión

- Crear una cuenta de entrenador de demostración exclusiva para Apple.
- Crear un alumno de demostración vinculado, con una rutina completa y al menos un video.
- No guardar contraseñas de revisión dentro del repositorio.
- En App Store Connect, explicar que el entrenador crea y asigna programas y que el alumno accede mediante invitación.
- Incluir pasos para probar: iniciar sesión, abrir un alumno, asignar plantilla, abrir la rutina del alumno y guardar una serie.
- Informar que la eliminación se inicia desde **Configuración > Cuenta** (entrenador) o **Perfil** (alumno).

## Capturas necesarias

Preparar de 3 a 6 capturas reales, sin datos personales, para el tamaño principal de iPhone solicitado por App Store Connect:

1. Dashboard del entrenador.
2. Lista de alumnos y prioridades.
3. Editor de rutina por bloques.
4. Inicio del alumno con rutina asignada.
5. Registro simple de una serie.
6. Progreso o historial.

## Antes del empaquetado iOS

- [ ] Ejecutar `supabase/account_deletion_migration.sql` en producción.
- [ ] Probar una solicitud de eliminación con una cuenta descartable.
- [ ] Confirmar que privacidad, términos, soporte y eliminación son públicos.
- [ ] Confirmar que el correo de soporte recibe mensajes.
- [ ] Revisar textos y datos de demostración.
- [ ] Confirmar que no hay errores de consola ni enlaces rotos.
- [ ] Crear el proyecto nativo y definir el identificador de paquete definitivo.
- [ ] Configurar firma, equipo y perfiles desde una Mac con Xcode.
- [ ] Generar el ícono final de 1024 × 1024 sin transparencia desde `assets/app-store/app-icon-source.svg`.
- [ ] Hacer una prueba en iPhone real, incluyendo red lenta, cámara/video, teclado y regreso desde segundo plano.
- [ ] Crear el archivo de la app con el SDK de iOS vigente y subirlo con Xcode.

## Pendientes que requieren decisiones externas

- Membresía activa de Apple Developer.
- Identificador de paquete (sugerencia: `app.progrezzia.mobile`, sujeto a disponibilidad).
- Nombre legal del vendedor y datos fiscales en App Store Connect.
- Política comercial definitiva de la aplicación.
- Revisión legal final de privacidad y términos antes de publicar.
