# Demo temporal para capturas y revisión de Google Play

El fixture crea solamente información ficticia: un entrenador, **Laura Demo**,
onboarding completo, una rutina de tres días, progreso, controles y mensajes.
No reutiliza alumnos ni conversaciones reales.

## Crear

La PC debe tener configuradas la URL de Supabase y la service role key. Se
pueden usar `STORE_DEMO_SUPABASE_URL` y
`STORE_DEMO_SUPABASE_SERVICE_ROLE_KEY`; si no están definidas, el script usa
las variables equivalentes de E2E o del proyecto.

```powershell
$env:STORE_DEMO_CONFIRM = '1'
npm run store-demo:create
```

Las credenciales aleatorias quedan solamente en
`.env.store-demo-credentials.json`. El patrón `.env*` ya está ignorado por Git
y el comando no imprime la contraseña.

Opcionalmente, `STORE_DEMO_EXERCISE_VIDEO_URL` permite agregar al Hip Thrust un
video propio y autorizado para mostrarlo en la guía del ejercicio.

## Eliminar

Al terminar las capturas o la revisión:

```powershell
$env:STORE_DEMO_CONFIRM = '1'
npm run store-demo:cleanup
```

El cleanup es idempotente y también localiza accesos `store-demo-*` anteriores
si el archivo privado se perdió. No coincide con correos de alumnos reales.
El archivo de credenciales se usa solamente para iniciar sesión: el cleanup no
confía en IDs guardados localmente y deriva su alcance del namespace de correos
demo reservado.

## Seguridad

- No compartir ni versionar `.env.store-demo-credentials.json`.
- Mantener los correos ficticios `@example.com`.
- Usar únicamente imágenes y videos propios o autorizados.
- El archivo marca un vencimiento operativo de 48 horas; el borrado es manual
  para no interrumpir una revisión que todavía esté en curso.
