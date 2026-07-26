export default function StudentProfileLoading() {
    return (
        <div className="p-4 pb-28 text-foreground md:p-8 animate-pulse">
            <div className="mx-auto max-w-5xl space-y-5 md:space-y-6">
                <div className="h-40 rounded-3xl border border-white/[0.06] bg-white/[0.03]" />

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-4">
                        <div className="h-48 rounded-3xl border border-white/[0.06] bg-white/[0.03]" />
                        <div className="h-32 rounded-3xl border border-white/[0.06] bg-white/[0.03]" />
                    </div>
                    <div className="space-y-4">
                        <div className="h-40 rounded-3xl border border-white/[0.06] bg-white/[0.03]" />
                        <div className="h-40 rounded-3xl border border-white/[0.06] bg-white/[0.03]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
