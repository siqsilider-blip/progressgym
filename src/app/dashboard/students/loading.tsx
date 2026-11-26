import TrainerPageShell from '@/components/dashboard/TrainerPageShell'

export default function StudentsLoading() {
    return (
        <TrainerPageShell notebook className="space-y-5 motion-safe:animate-pulse lg:space-y-7">
            <div className="flex items-end justify-between gap-4" aria-hidden="true">
                <div className="space-y-2">
                    <div className="h-8 w-36 rounded bg-muted lg:h-12 lg:w-48" />
                    <div className="h-4 w-40 rounded bg-muted/60" />
                </div>
                <div className="h-9 w-24 rounded-lg bg-muted lg:h-10 lg:w-32" />
            </div>

            <div className="space-y-2 lg:space-y-0 lg:border-t lg:border-border" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="flex h-16 items-center gap-3 rounded-xl border border-border bg-card px-3 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0"
                    >
                        <span className="size-8 rounded-full bg-muted" />
                        <span className="h-3 w-32 rounded bg-muted" />
                    </div>
                ))}
            </div>
        </TrainerPageShell>
    )
}
