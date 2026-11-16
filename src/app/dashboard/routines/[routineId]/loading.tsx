export default function RoutineDetailLoading() {
    return (
        <div className="p-4 pb-24 text-foreground md:p-8 animate-pulse">
            <div className="mx-auto max-w-[1600px] space-y-5">
                <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-white/[0.06]" />
                    <div className="h-8 w-56 rounded bg-white/[0.08]" />
                </div>

                <div className="grid gap-3 2xl:grid-cols-[17rem_minmax(0,1fr)]">
                    <div className="space-y-3">
                        <div className="h-56 rounded-xl border border-white/[0.06] bg-white/[0.03]" />
                        <div className="h-48 rounded-xl border border-white/[0.06] bg-white/[0.03]" />
                    </div>
                    <div className="space-y-3">
                        <div className="h-24 rounded-xl border border-white/[0.06] bg-white/[0.03]" />
                        <div className="h-80 rounded-xl border border-white/[0.06] bg-white/[0.03]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
