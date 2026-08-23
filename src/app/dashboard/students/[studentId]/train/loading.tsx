export default function TrainLoading() {
    return (
        <div className="p-3 pb-52 text-foreground md:p-6 md:pb-36 animate-pulse">
            <div className="mx-auto max-w-4xl space-y-4">
                <div className="h-20 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />

                <div className="flex gap-2">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-9 w-20 rounded-lg bg-white/[0.06]" />
                    ))}
                </div>

                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-32 rounded-xl border border-white/[0.06] bg-white/[0.03]" />
                    ))}
                </div>
            </div>
        </div>
    )
}
