export default function Loading() {
    return (
        <div className="animate-pulse p-4 pb-24 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-7 w-48 rounded-lg bg-muted" />
                    <div className="h-4 w-32 rounded-md bg-muted" />
                </div>
                <div className="h-10 w-24 shrink-0 rounded-lg bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl border border-border bg-card" />
                ))}
            </div>

            <div className="mt-4 space-y-3">
                <div className="h-40 rounded-2xl border border-border bg-card" />
                <div className="h-32 rounded-2xl border border-border bg-card" />
                <div className="h-48 rounded-2xl border border-border bg-card" />
            </div>
        </div>
    )
}
