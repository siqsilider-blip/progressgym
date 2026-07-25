'use client'

import { useEffect } from 'react'

export default function PWARegister() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

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

        navigator.serviceWorker.register('/sw.js').then((registration) => {
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
    }, [])

    return null
}
