export default function RoutineDetailLoading() {
    return (
        <div className="px-3 pb-24 pt-2 motion-safe:animate-pulse sm:px-4 sm:pt-3 md:p-6 lg:px-7 lg:py-7" aria-hidden="true">
            <div className="mx-auto max-w-[1600px] space-y-5">
                <div className="space-y-2 lg:border-b lg:border-border lg:pb-5">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-8 w-56 rounded bg-muted lg:h-12 lg:w-72" />
                    <div className="hidden h-4 w-40 rounded bg-muted lg:block" />
                </div>

                <div className="grid min-w-0 gap-4 xl:grid-cols-[12rem_minmax(0,1fr)] xl:gap-5 2xl:grid-cols-[13rem_minmax(0,1fr)] 2xl:gap-6">
                    <div className="grid gap-3 lg:max-xl:grid-cols-2 xl:border-r xl:border-border xl:pr-4">
                        <div className="h-28 rounded-lg bg-muted/50" />
                        <div className="h-28 rounded-lg bg-muted/50" />
                    </div>
                    <div className="min-w-0 space-y-2">
                        <div className="mb-4 h-8 w-2/3 max-w-64 rounded bg-muted" />
                        {[0, 1, 2, 3, 4].map((row) => (
                            <div key={row} className="flex h-10 items-center gap-4 border-t border-border">
                                <div className="h-3 w-1/4 rounded bg-muted" />
                                <div className="h-5 w-2/5 rounded bg-muted/60" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
