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
            className="h-full min-h-0 space-y-3 overflow-y-auto overscroll-contain px-3 py-4"
            aria-live="polite"
        >
            {children}
        </div>
    )
}
