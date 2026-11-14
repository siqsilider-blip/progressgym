# Progrezzia — preparación para Google Play

Actualizado: 13 de noviembre de 2026.

## Estado técnico

- Identificador: `app.progrezzia.mobile`.
- Nombre: **Progrezzia**.
- Versión inicial: `versionCode 1`, `versionName 1.0`.
- `targetSdkVersion 36` y `compileSdkVersion 36`.
- Android mínimo: API 24.
- App Links verificados con el APK de desarrollo para invitaciones y
  recuperación. La versión de Google Play queda pendiente de su huella real.
- Privacidad, soporte, términos y eliminación de cuenta disponibles públicamente.
- Ícono de 512 px e ícono de 1024 px sin transparencia disponibles.

Google Play exige API 36 para nuevas apps desde el 31 de agosto de 2026, por
lo que la configuración actual cumple el requisito:
https://support.google.com/googleplay/android-developer/answer/11926878

## Firma del AAB

Google Play App Signing utiliza dos claves diferentes:

- **Upload key:** la conserva Progrezzia y firma cada AAB que se sube.
- **App signing key:** la administra Google y firma lo que reciben los usuarios.

Referencia oficial:
https://support.google.com/googleplay/android-developer/answer/9842756

La upload key debe crearse de forma interactiva y guardarse fuera del
repositorio. No enviar su contraseña por chat, correo ni Git.

1. Crear una carpeta segura y respaldada fuera del proyecto.
2. Generar `progrezzia-upload.jks` con Android Studio o `keytool`.
3. Copiar `android/keystore.properties.example` como
   `android/keystore.properties`.
4. Completar la ruta, alias y contraseñas únicamente en la PC.
5. Ejecutar:

```powershell
npm run native:android:release
```

El comando valida TypeScript, build web, sincronización nativa, pruebas, lint,
genera el AAB y verifica su firma. El archivo final queda en:

`android/app/build/outputs/bundle/release/app-release.aab`

`keystore.properties`, `*.jks`, `*.keystore` y `*.aab` están excluidos de Git.
También se puede usar un gestor de secretos/CI mediante las variables
`PROGREZZIA_UPLOAD_STORE_FILE`, `PROGREZZIA_UPLOAD_STORE_PASSWORD`,
`PROGREZZIA_UPLOAD_KEY_ALIAS` y `PROGREZZIA_UPLOAD_KEY_PASSWORD`.

El comando también rechaza cualquier release si detecta
`CAPACITOR_DEV_SERVER` o `CAPACITOR_SERVER_URL`, y comprueba después de la
sincronización que el contenedor apunte exclusivamente al dominio HTTPS de
producción.

## Configuración de Play Console

- Crear la ficha con el identificador definitivo antes de subir el primer AAB.
- Activar Play App Signing.
- Usar la categoría **Salud y fitness**.
- Política de privacidad:
  `https://progressgym-sigma.vercel.app/privacy`
- Soporte:
  `https://progressgym-sigma.vercel.app/support`
- Eliminación de cuenta:
  `https://progressgym-sigma.vercel.app/account-deletion`
- Completar Data Safety de acuerdo con la política real y los proveedores
  Supabase/Vercel.
- Entregar credenciales de demostración funcionales al equipo de revisión.

La app permite crear cuentas, por lo que Google exige eliminación dentro de la
app y un recurso web externo. Ambos flujos ya existen. Referencia oficial:
https://support.google.com/googleplay/android-developer/answer/13327111

## Prueba cerrada

Si la cuenta personal de Play Console fue creada después del 13 de noviembre
de 2023, Google exige al menos 12 testers adheridos de forma continua durante
14 días antes de solicitar acceso a producción:
https://support.google.com/googleplay/android-developer/answer/14151465

Conviene comenzar con prueba interna y después abrir la prueba cerrada. Durante
esa etapa hay que probar en teléfonos reales:

- invitación y creación de cuenta;
- inicio de sesión y recuperación;
- rutina, guardado y edición de series;
- videos y mapa muscular;
- cámara/galería y fotos de progreso;
- notificaciones y segundo plano;
- mensajes, check-in y eliminación de cuenta.

## App Links de producción

Después de activar Play App Signing:

1. Copiar la huella SHA-256 de **App signing key certificate**.
2. Agregarla en Vercel a `ANDROID_APP_LINK_SHA256_FINGERPRINTS`.
3. Volver a desplegar.
4. Confirmar que `/.well-known/assetlinks.json` contiene la huella.
5. Probar un enlace de invitación en la versión instalada desde Google Play.

La huella de la upload key no reemplaza la huella de App Signing.

## Assets y textos de la ficha

- Feature graphic listo en
  `assets/app-store/google-play-feature-graphic-1024x500.png`.
- Título, descripción corta, descripción completa y textos sugeridos para las
  capturas listos en `docs/google-play-listing.md`.
- Pendiente: cinco o seis capturas reales de Android sin datos personales,
  preparadas en 1080 × 1920 px y PNG de 24 bits sin transparencia.

Antes de publicar, confirmar que `progressgym-sigma.vercel.app` será el dominio
permanente. Cambiarlo luego obliga a actualizar asociaciones y binarios.
