export default function StudentAppLoading() {
    return (
        <div className="mx-auto max-w-lg space-y-3 p-4 pb-24" aria-label="Cargando">
            <div className="h-6 w-36 animate-pulse rounded-lg bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded bg-muted/70" />
            <div className="grid grid-cols-3 gap-2 pt-2">
                {[0, 1, 2].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-xl border border-border bg-card" />
                ))}
            </div>
            <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
        </div>
    )
}
