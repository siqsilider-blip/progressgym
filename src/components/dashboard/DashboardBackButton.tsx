'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    DASHBOARD_BACK_KEY,
    DASHBOARD_HISTORY_KEY,
} from './DashboardNavigationTracker'

type DashboardBackButtonProps = {
    fallbackHref: string
    label?: string
    iconOnly?: boolean
    className?: string
}

export default function DashboardBackButton({
    fallbackHref,
    label = 'Volver',
    iconOnly = false,
    className = '',
}: DashboardBackButtonProps) {
    const router = useRouter()

    function goBack() {
        try {
            const stored = window.sessionStorage.getItem(DASHBOARD_HISTORY_KEY)
            const history = stored ? JSON.parse(stored) : []

            if (Array.isArray(history) && history.length > 1) {
                history.pop()
                const previousRoute = history.at(-1)
                if (typeof previousRoute === 'string' && previousRoute.startsWith('/dashboard')) {
                    window.sessionStorage.setItem(DASHBOARD_HISTORY_KEY, JSON.stringify(history))
                    window.sessionStorage.setItem(DASHBOARD_BACK_KEY, '1')
                    router.push(previousRoute)
                    return
                }
            }
        } catch {
            // Si el historial local no está disponible, usamos la ruta segura.
        }

        router.push(fallbackHref)
    }

    return (
        <button
            type="button"
            onClick={goBack}
            aria-label={label}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white ${iconOnly ? 'h-9 w-9' : 'h-9 px-3'} ${className}`}
        >
            <ArrowLeft className="h-4 w-4" />
            {!iconOnly && <span>{label}</span>}
        </button>
    )
}
