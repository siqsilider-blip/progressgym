import * as React from 'react'

export default function AppCard({
    children,
    className = '',
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={`rounded-3xl border border-border bg-card text-card-foreground shadow-sm ${className}`}
        >
            {children}
        </div>
    )
}