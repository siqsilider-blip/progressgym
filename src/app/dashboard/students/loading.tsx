export default function Loading() {
    return (
        <div className="animate-pulse px-4 pb-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-32 rounded-lg bg-muted" />
                    <div className="h-4 w-48 rounded-md bg-muted" />
                </div>
                <div className="h-10 w-32 shrink-0 rounded-lg bg-muted" />
            </div>

            <div className="space-y-3">
                <div className="h-10 rounded-xl bg-muted" />

                <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-8 w-24 rounded-full bg-muted" />
                    ))}
                </div>

                <div className="h-4 w-20 rounded-md bg-muted" />

                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl border border-border bg-card" />
                ))}
            </div>
        </div>
    )
}
