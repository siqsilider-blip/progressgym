# Progrezzia — contenedor nativo

Actualizado: 8 de noviembre de 2026.

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

## Entorno Android verificado

En esta PC ya están instalados:

- Android Studio 2026.2.2.8.
- Microsoft OpenJDK 21 LTS.
- Android SDK en `C:\Users\siqsi\AppData\Local\Android\Sdk`.
- Android Platform 36.
- Android Build Tools 35.0.0 y 36.0.0.
- Android Platform Tools / ADB 37.0.1.

El proyecto compila correctamente con Gradle 8.14.3 y JDK 21. El JBR 25
incluido con Android Studio no debe usarse actualmente para este wrapper,
porque genera `Unsupported class file major version 69`.

`android/local.properties` debe apuntar al SDK local:

```properties
sdk.dir=C\:\\Users\\siqsi\\AppData\\Local\\Android\\Sdk
```

Ese archivo es local y está excluido de Git.

### Compilar APK de prueba en Windows

```powershell
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot'
Set-Location android
.\gradlew.bat assembleDebug --no-daemon
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
La compilación verificada el 8 de noviembre de 2026 pesa 5.106.749 bytes y
sirve exclusivamente para pruebas internas. Está firmada con el certificado
debug de Android; no es el binario que se publica en Google Play.

### Pruebas Android

```powershell
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot'
Set-Location android
.\gradlew.bat testDebugUnitTest lintDebug --no-daemon
```

Las pruebas unitarias, el lint Android y la compilación de `bundleRelease`
finalizaron correctamente el 8 de noviembre de 2026. Lint quedó en 0 errores y
30 advertencias no bloqueantes. Las pruebas unitarias nativas actuales son
básicas: el smoke test completo en un teléfono real sigue siendo obligatorio.
El AAB generado todavía está sin firma y no debe subirse a Google Play hasta
configurar la upload key.

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

## Pendientes antes de Google Play

- Instalar el APK debug y validar la aplicación en al menos un teléfono Android real.
- Probar inicio de sesión, entrenamiento, fotos, notificaciones, botón Atrás,
  segundo plano, cámara/galería y enlaces de invitación y recuperación.
- Crear la aplicación en Google Play Console.
- Definir y resguardar la clave de firma de publicación fuera de Git.
- Activar Play App Signing y generar un AAB release firmado.
- Incrementar `versionCode` para cada nueva subida a Play Console.
- Completar ficha de tienda, política de privacidad, Data Safety, clasificación
  de contenido y las pruebas cerradas que requiera Google.
- Publicar `assetlinks.json` con la huella SHA-256 real de publicación.
- Confirmar el dominio definitivo antes de cerrar los enlaces universales.

## Pendientes antes de App Store

- Mac con Xcode.
- Membresía Apple Developer y certificados.
- Bundle ID y Associated Domains.
- Pruebas físicas en iPhone y generación del archivo de distribución.

Un dominio propio es preferible antes de publicar: cambiarlo luego obliga a
actualizar asociaciones y binarios en ambas tiendas.
