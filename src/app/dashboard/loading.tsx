export default function DashboardLoading() {
    return (
        <div className="mx-auto max-w-[1600px] space-y-5 px-4 pb-24 pt-4 motion-safe:animate-pulse md:px-6 lg:space-y-8 lg:pt-9 xl:px-8" aria-hidden="true">
            <div className="space-y-2">
                <div className="hidden h-4 w-40 rounded bg-muted lg:block" />
                <div className="h-7 w-24 rounded bg-muted lg:h-12 lg:w-32" />
                <div className="h-3 w-36 rounded bg-muted lg:h-4 lg:w-48" />
            </div>

            <div className="grid grid-cols-3 gap-2 lg:gap-0 lg:border-y lg:border-border">
                {[0, 1, 2].map((metric) => (
                    <div key={metric} className="space-y-2 rounded-xl border border-border p-3 lg:rounded-none lg:border-0 lg:px-5 lg:py-4 lg:first:pl-0 lg:[&:not(:first-child)]:border-l">
                        <div className="h-3 w-2/3 rounded bg-muted" />
                        <div className="h-5 w-7 rounded bg-muted lg:h-8" />
                        <div className="h-2.5 w-full max-w-36 rounded bg-muted" />
                    </div>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-7 xl:gap-10">
                {[0, 1].map((column) => (
                    <div key={column} className="rounded-2xl border border-border p-4 lg:rounded-none lg:border-0 lg:p-0">
                        <div className="mb-2 h-6 w-36 rounded bg-muted" />
                        {[0, 1, 2].map((row) => (
                            <div key={row} className="flex h-14 items-center gap-3 border-t border-border">
                                <div className="size-8 rounded-full bg-muted" />
                                <div className="h-3 w-28 rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
