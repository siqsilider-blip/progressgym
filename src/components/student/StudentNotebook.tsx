import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'

export const notebookPage = 'mx-auto max-w-lg space-y-6 px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6'
export const notebookGroup = 'space-y-2'
export const notebookSectionTitle = 'text-base font-semibold text-foreground'
export const notebookRow = 'flex min-h-12 w-full min-w-0 items-center gap-3 border-t border-border py-2.5 text-left text-sm text-foreground transition hover:text-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
export const notebookSummary = 'flex min-h-12 cursor-pointer list-none items-center gap-3 border-t border-border py-2.5 text-sm text-foreground [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function StudentNotebookHeader({ title, section, subtitle }: { title: string; section: string; subtitle?: string }) {
    return (
        <header className="min-w-0 space-y-1.5">
            <p className="text-sm font-semibold text-brand-soft">{section}</p>
            <h1 className="font-[family-name:Georgia,'Times_New_Roman',serif] text-[2.5rem] font-normal leading-[1.04] tracking-[-0.045em] text-foreground [overflow-wrap:anywhere] sm:text-5xl">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{subtitle}</p>}
        </header>
    )
}

export function NotebookRowText({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <span className="block font-semibold">{title}</span>
            {subtitle && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{subtitle}</span>}
        </span>
    )
}

export function NotebookLinkRow({ href, title, subtitle, icon: Icon, prefetch }: { href: string; title: string; subtitle?: string; icon: LucideIcon; prefetch?: false }) {
    return (
        <Link href={href} prefetch={prefetch} className={notebookRow}>
            <Icon className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />
            <NotebookRowText title={title} subtitle={subtitle} />
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
    )
}
