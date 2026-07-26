export default function DashboardLoading() {
    return (
        <div className="space-y-5 p-4 pb-24 md:space-y-8 md:p-8 animate-pulse">
            <div className="max-w-2xl space-y-3">
                <div className="h-3 w-24 rounded bg-white/[0.06]" />
                <div className="h-8 w-48 rounded bg-white/[0.08]" />
                <div className="h-4 w-72 rounded bg-white/[0.05]" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div className="h-24 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
                <div className="h-24 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
                ))}
            </div>

            <div className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
        </div>
    )
}
