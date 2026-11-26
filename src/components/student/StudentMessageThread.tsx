'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'

export default function StudentMessageThread({
    children,
    scrollKey,
}: {
    children: ReactNode
    scrollKey: string
}) {
    const containerRef = useRef<HTMLDivElement | null>(null)

    useLayoutEffect(() => {
        const container = containerRef.current
        if (!container) return

        const frame = window.requestAnimationFrame(() => {
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
        })

        return () => window.cancelAnimationFrame(frame)
    }, [scrollKey])

    return (
        <div
            ref={containerRef}
            className="h-full min-h-0 space-y-4 overflow-y-auto overscroll-contain py-2 pr-1"
            role="log"
            aria-label="Conversación con tu entrenador"
            aria-live="polite"
        >
            {children}
        </div>
    )
}
