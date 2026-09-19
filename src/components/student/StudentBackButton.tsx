'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { STUDENT_BACK_KEY, STUDENT_HISTORY_KEY } from './StudentNavigationTracker'

export default function StudentBackButton({ fallbackHref = '/app' }: { fallbackHref?: string }) {
    const router = useRouter()

    function goBack() {
        try {
            const stored = window.sessionStorage.getItem(STUDENT_HISTORY_KEY)
            const history = stored ? JSON.parse(stored) : []
            if (Array.isArray(history) && history.length > 1) {
                history.pop()
                const previous = history.at(-1)
                if (typeof previous === 'string' && previous.startsWith('/app')) {
                    window.sessionStorage.setItem(STUDENT_HISTORY_KEY, JSON.stringify(history))
                    window.sessionStorage.setItem(STUDENT_BACK_KEY, '1')
                    router.push(previous)
                    return
                }
            }
        } catch {
            // La ruta segura sigue disponible si sessionStorage falla.
        }
        router.push(fallbackHref)
    }

    return (
        <button
            type="button"
            onClick={goBack}
            aria-label="Volver"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground transition active:scale-95"
        >
            <ArrowLeft className="h-4 w-4" />
        </button>
    )
}
