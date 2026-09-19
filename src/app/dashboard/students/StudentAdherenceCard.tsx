import type { StudentAdherence } from './getStudentAdherence'

export default function StudentAdherenceCard({
    adherence,
}: {
    adherence: StudentAdherence
}) {
    const progress =
        adherence.plannedSessions > 0
            ? Math.min(adherence.percentage, 100)
            : 0

    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Adherencia
                </p>
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {adherence.percentage}%
                </p>
            </div>

            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {adherence.completedSessions}
                <span className="text-base font-medium text-zinc-400"> / {adherence.plannedSessions}</span>
            </p>

            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Últimas 4 semanas
            </p>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}
