type Volume = {
    muscle: string
    sets: number
}

export default function StudentWeeklyVolumeCard({
    volume,
}: {
    volume: Volume[]
}) {
    if (!volume.length) return null

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Volumen semanal
            </h2>

            <div className="space-y-3">
                {volume.map((item) => (
                    <div
                        key={item.muscle}
                        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
                    >
                        <span className="capitalize text-zinc-200">
                            {item.muscle}
                        </span>

                        <span className="font-semibold text-indigo-400">
                            {item.sets} series
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}