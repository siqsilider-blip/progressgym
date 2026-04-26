export default function Loading() {
    return (
        <div className="animate-pulse p-4 pb-24 md:p-8">
            <div className="mb-4 space-y-2">
                <div className="h-8 w-32 rounded-lg bg-muted" />
                <div className="h-4 w-48 rounded-md bg-muted" />
            </div>

            <div className="mx-auto max-w-xl space-y-4">
                <div className="h-14 rounded-2xl border border-border bg-card" />
                <div className="h-40 rounded-2xl border border-border bg-card" />
            </div>
        </div>
    )
}
