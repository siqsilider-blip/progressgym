export default function Loading() {
    return (
        <div className="animate-pulse p-3 pb-52 md:p-6 md:pb-36">
            <div className="mx-auto max-w-4xl">
                <div className="mb-4 border-b border-border pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1.5">
                            <div className="h-5 w-36 rounded-md bg-muted" />
                            <div className="h-3.5 w-48 rounded-md bg-muted" />
                        </div>
                        <div className="h-4 w-12 rounded-md bg-muted" />
                    </div>
                </div>

                <div className="mb-4 flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-9 w-20 rounded-lg bg-muted" />
                    ))}
                </div>

                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="mb-3 h-36 rounded-2xl border border-border bg-card" />
                ))}
            </div>
        </div>
    )
}
