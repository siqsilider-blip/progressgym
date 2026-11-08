'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function PWARegister() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        // El contenedor nativo ya controla su propio ciclo de actualización.
        // Evitamos que un service worker web deje una versión vieja en el WebView.
        if (Capacitor.isNativePlatform()) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((registration) => registration.unregister())
            })
            return
        }

        // En desarrollo NO registramos el Service Worker: los reinicios
        // frecuentes de `npm run dev` generan archivos con hashes nuevos
        // todo el tiempo, y un SW cacheado interfiere con eso (rompe el
        // hot-reload y deja la app "pegada" a una build vieja).
        if (process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((registration) => registration.unregister())
            })
            return
        }

        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing
                    if (!newWorker) return

                    newWorker.addEventListener('statechange', () => {
                        if (
                            newWorker.state === 'installed' &&
                            navigator.serviceWorker.controller
                        ) {
                            // Hay una versión nueva del SW lista — recargamos
                            // para que el usuario siempre tenga el código actual.
                            window.location.reload()
                        }
                    })
                })
            })
            .catch((error) => {
                console.error('[PWA] No se pudo registrar el service worker:', error)
            })
    }, [])

    return null
}
