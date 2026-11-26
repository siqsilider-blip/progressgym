import TrainerPageShell from '@/components/dashboard/TrainerPageShell'

export default function StudentProfileLoading() {
    return (
        <TrainerPageShell notebook className="space-y-5 motion-safe:animate-pulse lg:space-y-7">
            <div aria-hidden="true" className="space-y-5">
                <div className="space-y-2">
                    <div className="h-7 w-9 rounded-md bg-muted" />
                    <div className="h-8 w-52 rounded bg-muted lg:h-12 lg:w-72" />
                    <div className="h-3 w-28 rounded bg-muted/60" />
                </div>
                <div className="hidden h-12 items-center gap-4 border-y border-border lg:flex">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-3 w-24 rounded bg-muted" />)}
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.62fr)] lg:gap-7">
                    <div className="space-y-3">
                        <div className="h-16 rounded-lg border border-border lg:rounded-none lg:border-x-0 lg:border-t-0" />
                        <div className="h-36 rounded-lg bg-muted/50" />
                    </div>
                    <div className="h-44 rounded-lg bg-muted/50" />
                </div>
            </div>
        </TrainerPageShell>
    )
}
