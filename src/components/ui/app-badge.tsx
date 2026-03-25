import * as React from 'react'

export default function AppBadge({
    children,
    className = '',
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <span
            className={`inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground ${className}`}
        >
            {children}
        </span>
    )
}