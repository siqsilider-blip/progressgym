'use client'

import type { ReactNode } from 'react'
import DashboardBackButton from './DashboardBackButton'

type DashboardPageHeaderProps = {
    title: string
    subtitle?: string
    action?: ReactNode
    backHref?: string
    backLabel?: string
    notebook?: boolean
}

export default function DashboardPageHeader({
    title,
    subtitle,
    action,
    backHref,
    backLabel,
    notebook = false,
}: DashboardPageHeaderProps) {
    return (
        <header className={`flex items-center justify-between gap-3 ${notebook ? 'lg:flex-wrap lg:items-end lg:gap-x-6 lg:gap-y-3' : ''}`}>
            <div className={`flex min-w-0 items-center gap-2.5 ${notebook ? 'lg:flex-col lg:items-start lg:gap-2' : ''}`}>
                {backHref && (
                    <DashboardBackButton
                        fallbackHref={backHref}
                        label={backLabel}
                        iconOnly={!backLabel}
                        className={notebook ? 'lg:h-7 lg:rounded-md lg:border-transparent lg:bg-transparent lg:text-muted-foreground lg:hover:bg-muted lg:hover:text-foreground' : undefined}
                    />
                )}
                <div className="min-w-0">
                    <h1 className={`truncate text-xl font-black tracking-tight text-foreground md:text-2xl ${notebook ? "lg:whitespace-normal lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-5xl lg:font-normal lg:leading-[1.04] lg:tracking-[-0.045em] lg:[overflow-wrap:anywhere] xl:text-[3.5rem]" : ''}`}>
                        {title}
                    </h1>
                    {subtitle && (
                        <p className={`mt-0.5 truncate text-xs text-muted-foreground ${notebook ? 'lg:mt-2 lg:whitespace-normal lg:text-sm lg:[overflow-wrap:anywhere]' : ''}`}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {action && <div className={notebook ? 'shrink-0 lg:max-w-full' : 'shrink-0'}>{action}</div>}
        </header>
    )
}
