import { Capacitor } from '@capacitor/core'
import { Haptics, NotificationType } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'

function notificationId(sessionId: string) {
  let hash = 0
  for (let index = 0; index < sessionId.length; index += 1) {
    hash = ((hash << 5) - hash + sessionId.charCodeAt(index)) | 0
  }
  return Math.max(1, Math.abs(hash % 2_000_000_000))
}

export async function scheduleNativeRestNotice(input: {
  sessionId: string
  exerciseName: string
  seconds: number
}) {
  if (!Capacitor.isNativePlatform() || input.seconds <= 0) return

  const permission = await LocalNotifications.checkPermissions()
  const status = permission.display === 'prompt' || permission.display === 'prompt-with-rationale'
    ? await LocalNotifications.requestPermissions()
    : permission
  if (status.display !== 'granted') return

  const id = notificationId(input.sessionId)
  await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => undefined)
  await LocalNotifications.schedule({
    notifications: [{
      id,
      title: 'Descanso terminado',
      body: `Ya podés continuar con ${input.exerciseName}.`,
      schedule: {
        at: new Date(Date.now() + input.seconds * 1000),
        allowWhileIdle: true,
      },
      // Evita abrir la pantalla de “Alarmas y recordatorios” en Android 12+.
      // Para un descanso es preferible una alarma levemente inexacta a pedir un
      // permiso especial que la persona no necesita comprender ni administrar.
      isExactNotification: false,
      extra: {
        sessionId: input.sessionId,
        route: `${window.location.pathname}${window.location.search}`,
      },
    }],
  })
}

export async function cancelNativeRestNotice(sessionId: string) {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.cancel({
    notifications: [{ id: notificationId(sessionId) }],
  }).catch(() => undefined)
}

export async function signalRestFinished() {
  if (Capacitor.isNativePlatform()) {
    await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined)
    return
  }

  if (document.visibilityState === 'visible') window.navigator.vibrate?.(150)
}
