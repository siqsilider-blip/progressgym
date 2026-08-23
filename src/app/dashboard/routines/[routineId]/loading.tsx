export default function RoutineDetailLoading() {
    return (
        <div className="p-4 pb-24 text-foreground md:p-8 animate-pulse">
            <div className="mx-auto max-w-4xl space-y-5">
                <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-white/[0.06]" />
                    <div className="h-8 w-56 rounded bg-white/[0.08]" />
                </div>

                <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-9 w-24 rounded-xl bg-white/[0.06]" />
                    ))}
                </div>

                <div className="space-y-3">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
                    ))}
                </div>
            </div>
        </div>
    )
}
