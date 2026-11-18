'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export default function StudentMessageThread({ children }: { children: ReactNode }) {
    const containerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        container.scrollTop = container.scrollHeight
    }, [children])

    return (
        <div
            ref={containerRef}
            className="max-h-[calc(100dvh-22rem)] min-h-72 space-y-3 overflow-y-auto overscroll-contain px-3 py-4"
            aria-live="polite"
        >
            {children}
        </div>
    )
}
