export default function StudentsLoading() {
    return (
        <div className="p-4 pb-24 md:p-8 animate-pulse">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-white/[0.06]" />
                    <div className="h-8 w-40 rounded bg-white/[0.08]" />
                    <div className="h-4 w-56 rounded bg-white/[0.05]" />
                </div>
                <div className="h-10 w-28 rounded-xl bg-white/[0.06]" />
            </div>

            <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="h-16 rounded-2xl border border-white/[0.06] bg-white/[0.03]"
                    />
                ))}
            </div>
        </div>
    )
}
