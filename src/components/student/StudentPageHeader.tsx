import type { ReactNode } from 'react'
import StudentBackButton from './StudentBackButton'

export default function StudentPageHeader({
    title,
    subtitle,
    action,
    back,
}: {
    title: string
    subtitle?: string
    action?: ReactNode
    back?: boolean
}) {
    return (
        <header className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
                {back && <StudentBackButton />}
                <div className="min-w-0">
                    <h1 className="truncate text-xl font-black tracking-tight text-foreground">{title}</h1>
                    {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </header>
    )
}
