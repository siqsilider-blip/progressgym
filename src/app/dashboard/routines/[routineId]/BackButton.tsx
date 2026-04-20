'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
    const router = useRouter()
    return (
        <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-secondary-foreground transition hover:bg-muted"
            aria-label="Volver"
        >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
        </button>
    )
}
