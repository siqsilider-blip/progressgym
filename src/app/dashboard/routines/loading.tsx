import TrainerPageShell from '@/components/dashboard/TrainerPageShell'

export default function RoutinesLoading() {
    return (
        <TrainerPageShell notebook>
            <p className="sr-only" role="status">Cargando rutinas…</p>
            <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse lg:space-y-7">
                <div className="flex items-end justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-6 w-28 rounded bg-muted lg:h-12 lg:w-40" />
                        <div className="h-3 w-36 rounded bg-muted" />
                    </div>
                    <div className="h-9 w-20 rounded-lg bg-muted" />
                </div>

                <div className="h-10 w-full rounded-lg bg-muted lg:max-w-lg" />
                <div className="divide-y divide-border rounded-xl border border-border lg:rounded-none lg:border-x-0">
                    {[0, 1, 2, 3].map((row) => (
                        <div key={row} className="flex min-h-14 items-center gap-3 px-3 lg:px-0">
                            <div className="size-8 shrink-0 rounded-full bg-muted" />
                            <div className="h-3 w-1/3 max-w-40 rounded bg-muted" />
                        </div>
                    ))}
                </div>
            </div>
        </TrainerPageShell>
    )
}
