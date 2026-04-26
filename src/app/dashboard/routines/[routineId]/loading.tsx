export default function Loading() {
    return (
        <div className="animate-pulse p-3 pb-24 md:p-6">
            <div className="mx-auto max-w-3xl">
                <div className="mb-4 flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-muted" />
                    <div className="h-7 flex-1 rounded-lg bg-muted" />
                </div>

                <div className="mb-4 space-y-1.5">
                    <div className="h-4 w-56 rounded-md bg-muted" />
                    <div className="h-11 rounded-xl bg-muted" />
                </div>

                <div className="mb-4 flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-9 w-20 rounded-lg bg-muted" />
                    ))}
                </div>

                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="mb-3 h-16 rounded-xl border border-border bg-card" />
                ))}
            </div>
        </div>
    )
}
