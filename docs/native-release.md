# Progrezzia — contenedor nativo

Actualizado: 7 de noviembre de 2026.

## Arquitectura elegida

Progrezzia mantiene Next.js y Supabase como backend y frontend compartido. La aplicación usa Server Components, Server Actions, cookies seguras y rutas dinámicas, por lo que convertirla a un `next export` estático rompería autenticación, rutinas e invitaciones.

Los proyectos de Capacitor cargan el origen HTTPS canónico:

`https://progressgym-sigma.vercel.app`

Esta decisión evita mantener dos aplicaciones diferentes. También exige probar cada publicación web en dispositivos reales: el contenido se entrega desde el servidor y una caída de red no puede reemplazarse por una compilación local completa. `native-shell/offline.html` ofrece una salida clara cuando el servidor no está disponible.

> Riesgo de revisión: Apple exige que una aplicación aporte valor por encima de un sitio envuelto. Antes de enviarla deben validarse las integraciones nativas, especialmente navegación del sistema, aviso de descanso, hápticos, cámara/selector de fotos y compartir comparativas.

## Integraciones ya preparadas

- Navegación Atrás de Android sin perder el contexto previo.
- Apertura interna y validada de invitación, recuperación y avisos.
- Conservación del entrenamiento al volver desde segundo plano.
- Notificación local al finalizar un descanso y respuesta háptica.
- Teclado, splash screen y barra de estado adaptados al diseño oscuro.
- Pantalla local de error de conexión.
- Copias de seguridad de Android deshabilitadas para no respaldar sesiones y datos sensibles.

## Comandos

```bash
npm install
npm run native:sync
npm run native:android
npm run native:ios
```

`native:android` requiere Android Studio, JDK y Android SDK. `native:ios` requiere una Mac con Xcode.

Para probar contra otro servidor HTTPS durante desarrollo hay que habilitarlo
explícitamente (sin la bandera, una compilación siempre usa producción):

```bash
CAPACITOR_DEV_SERVER=1 CAPACITOR_SERVER_URL=https://servidor-de-prueba.example npm run native:sync
```

Nunca compilar una versión de tienda apuntando a `http://`, `localhost` o una preview temporal de Vercel.

## Enlaces verificados pendientes

La app ya declara los paths de invitación y recuperación, pero los sistemas operativos no los abrirán automáticamente hasta completar la asociación de dominio:

### Android

1. Crear la app en Google Play Console y activar Play App Signing.
2. Obtener las huellas SHA-256 de publicación y, si corresponde, de desarrollo.
3. Publicar `/.well-known/assetlinks.json` con `app.progrezzia.mobile` y esas huellas.
4. Probar cada enlace con `adb` en un teléfono real.

### iOS

1. Confirmar el Bundle ID `app.progrezzia.mobile` en Apple Developer.
2. Obtener el Team ID.
3. Publicar `/.well-known/apple-app-site-association` con `TEAM_ID.app.progrezzia.mobile`.
4. Habilitar Associated Domains en la firma y probar invitación, recuperación y arranque en frío.

No se deben publicar archivos `.well-known` con valores ficticios: un identificador o certificado incorrecto deja los enlaces rotos.

## Bloqueos externos actuales

- Esta PC no tiene Android Studio, Java ni Android SDK; puede generar el proyecto, pero no compilar el AAB todavía.
- iOS necesita Mac, Xcode, membresía Apple Developer y certificados de firma.
- Falta confirmar que el dominio definitivo seguirá siendo `progressgym-sigma.vercel.app`. Un dominio propio es preferible antes de publicar, porque cambiarlo luego obliga a actualizar asociaciones y binarios.
