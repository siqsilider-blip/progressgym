import type { ReactNode } from 'react'

type TrainerPageShellProps = {
    children: ReactNode
    className?: string
    width?: 'wide' | 'standard' | 'form'
    notebook?: boolean
}

const widthClasses = {
    wide: 'max-w-[1600px]',
    standard: 'max-w-7xl',
    form: 'max-w-5xl',
}

export default function TrainerPageShell({
    children,
    className = '',
    width = 'wide',
    notebook = false,
}: TrainerPageShellProps) {
    return (
        <div
            className={`mx-auto w-full ${widthClasses[width]} px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6 xl:px-8 ${notebook ? 'lg:pt-9' : ''} ${className}`}
        >
            {children}
        </div>
    )
}
