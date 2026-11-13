'use client'

import * as React from 'react'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { usePathname, useRouter } from 'next/navigation'

const DEFAULT_WEB_HOST = 'progressgym-sigma.vercel.app'
const RESUME_REFRESH_AFTER_MS = 30_000
const SAFE_DEEP_LINK_PATHS = [
  '/auth/invitation',
  '/auth/confirm',
  '/reset-password',
  '/notifications/open',
]

function allowedWebHosts() {
  const hosts = new Set([DEFAULT_WEB_HOST])
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (configuredUrl) {
    try {
      hosts.add(new URL(configuredUrl).host)
    } catch {
      // Una variable inválida no debe ampliar los hosts permitidos.
    }
  }

  return hosts
}

function internalPathFromDeepLink(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' || !allowedWebHosts().has(url.host)) return null
    if (!SAFE_DEEP_LINK_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
      return null
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

function roleRoot(pathname: string) {
  if (pathname.startsWith('/dashboard')) return '/dashboard'
  if (pathname.startsWith('/app')) return '/app'
  return '/login'
}

export default function NativeAppBridge() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = React.useRef(pathname)
  const backgroundedAtRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let disposed = false
    const handles: PluginListenerHandle[] = []

    const openDeepLink = (rawUrl: string | undefined) => {
      if (!rawUrl) return
      const target = internalPathFromDeepLink(rawUrl)
      if (target) router.push(target)
    }

    const setup = async () => {
      await Promise.allSettled([
        // Capacitor llama `Dark` al estilo pensado para fondos oscuros:
        // muestra texto e iconos claros en la barra de estado.
        StatusBar.setStyle({ style: Style.Dark }),
        StatusBar.setBackgroundColor({ color: '#111111' }),
        SplashScreen.hide(),
        ...(Capacitor.getPlatform() === 'android'
          ? [App.toggleBackButtonHandler({ enabled: true })]
          : []),
      ])

      const urlHandle = await App.addListener('appUrlOpen', ({ url }) => openDeepLink(url))
      if (disposed) await urlHandle.remove()
      else handles.push(urlHandle)

      const stateHandle = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          backgroundedAtRef.current = Date.now()
          return
        }

        const elapsed = backgroundedAtRef.current == null
          ? 0
          : Date.now() - backgroundedAtRef.current
        backgroundedAtRef.current = null
        window.dispatchEvent(new CustomEvent('progrezzia:native-resume'))

        const currentPath = pathnameRef.current
        const isWorkout = currentPath === '/app/train'
          || /^\/dashboard\/students\/[^/]+\/train/.test(currentPath)
        if (elapsed >= RESUME_REFRESH_AFTER_MS && !isWorkout) router.refresh()
      })
      if (disposed) await stateHandle.remove()
      else handles.push(stateHandle)

      const backHandle = await App.addListener('backButton', async ({ canGoBack }) => {
        const openDialogs = Array.from(
          document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
        )
        const openDialog = openDialogs.reverse().find((dialog) => dialog.getClientRects().length > 0)
        if (openDialog) {
          openDialog.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            bubbles: true,
            cancelable: true,
          }))
          return
        }

        const currentPath = pathnameRef.current
        if (currentPath === '/app' || currentPath === '/dashboard' || currentPath === '/login') {
          await App.minimizeApp()
          return
        }

        if (canGoBack && window.history.length > 1) {
          window.history.back()
          return
        }

        router.replace(roleRoot(currentPath))
      })
      if (disposed) await backHandle.remove()
      else handles.push(backHandle)

      const notificationHandle = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        ({ notification }) => {
          const route = notification.extra?.route
          if (typeof route !== 'string') return
          if (/^\/app\/train(?:\?|$)/.test(route) || /^\/dashboard\/students\/[^/]+\/train(?:\?|$)/.test(route)) {
            router.push(route)
          }
        }
      )
      if (disposed) await notificationHandle.remove()
      else handles.push(notificationHandle)

      const launch = await App.getLaunchUrl()
      if (!disposed) openDeepLink(launch?.url)
    }

    void setup().catch(() => undefined)

    return () => {
      disposed = true
      handles.forEach((handle) => void handle.remove())
    }
  }, [router])

  return null
}
