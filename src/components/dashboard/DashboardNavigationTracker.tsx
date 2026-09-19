'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export const DASHBOARD_HISTORY_KEY = 'progrezzia:dashboard-history'
export const DASHBOARD_BACK_KEY = 'progrezzia:dashboard-going-back'

function readHistory() {
    try {
        const stored = window.sessionStorage.getItem(DASHBOARD_HISTORY_KEY)
        const parsed = stored ? JSON.parse(stored) : []
        return Array.isArray(parsed)
            ? parsed.filter((value): value is string => typeof value === 'string')
            : []
    } catch {
        return []
    }
}

export default function DashboardNavigationTracker() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const query = searchParams.toString()

    useEffect(() => {
        const route = `${pathname}${query ? `?${query}` : ''}`
        const isBackNavigation = window.sessionStorage.getItem(DASHBOARD_BACK_KEY) === '1'
        const history = readHistory()

        if (isBackNavigation) {
            window.sessionStorage.removeItem(DASHBOARD_BACK_KEY)
            if (history.at(-1) !== route) history.push(route)
        } else if (history.at(-2) === route) {
            // También mantenemos el historial sincronizado si se usa el
            // botón Atrás nativo del navegador o del teléfono.
            history.pop()
        } else if (history.at(-1) !== route) {
            history.push(route)
        }

        window.sessionStorage.setItem(
            DASHBOARD_HISTORY_KEY,
            JSON.stringify(history.slice(-40))
        )
    }, [pathname, query])

    return null
}
