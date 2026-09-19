export default function RoutinesLoading() {
    return (
        <div className="mx-auto max-w-3xl animate-pulse p-4 pb-24 md:p-6">
            <div className="mb-3 flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-6 w-28 rounded bg-white/[0.08]" />
                    <div className="h-3 w-40 rounded bg-white/[0.05]" />
                </div>
                <div className="h-8 w-20 rounded-lg bg-white/[0.06]" />
            </div>

            <div className="mb-3 h-9 rounded-lg bg-white/[0.05]" />
            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="h-14 border-b border-white/[0.05] bg-white/[0.025] last:border-0"
                    />
                ))}
            </div>
        </div>
    )
}
