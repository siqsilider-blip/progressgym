'use client'

import type { ReactNode } from 'react'
import DashboardBackButton from './DashboardBackButton'

type DashboardPageHeaderProps = {
    title: string
    subtitle?: string
    action?: ReactNode
    backHref?: string
    backLabel?: string
}

export default function DashboardPageHeader({
    title,
    subtitle,
    action,
    backHref,
    backLabel,
}: DashboardPageHeaderProps) {
    return (
        <header className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
                {backHref && (
                    <DashboardBackButton
                        fallbackHref={backHref}
                        label={backLabel}
                        iconOnly={!backLabel}
                    />
                )}
                <div className="min-w-0">
                    <h1 className="truncate text-xl font-black tracking-tight text-foreground md:text-2xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {action && <div className="shrink-0">{action}</div>}
        </header>
    )
}
