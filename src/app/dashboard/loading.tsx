export default function Loading() {
    return (
        <div className="animate-pulse space-y-5 p-4 pb-24 md:space-y-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-40 rounded-lg bg-muted" />
                    <div className="h-4 w-56 rounded-md bg-muted" />
                </div>
                <div className="h-10 w-28 shrink-0 rounded-lg bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-xl bg-muted" />
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl border border-border bg-card" />
                ))}
            </div>

            <div className="h-40 rounded-2xl border border-border bg-card" />

            <div className="grid gap-5 xl:grid-cols-12">
                <div className="h-56 rounded-2xl border border-border bg-card xl:col-span-8" />
                <div className="h-56 rounded-2xl border border-border bg-card xl:col-span-4" />
            </div>
        </div>
    )
}
