import type { StudentAdherence } from './getStudentAdherence'

export default function StudentAdherenceCard({
    adherence,
}: {
    adherence: StudentAdherence
}) {
    const progressWidth =
        adherence.plannedSessions > 0
            ? Math.min(adherence.percentage, 100)
            : 0

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Adherencia
            </h2>

            <div className="space-y-3">
                <p className="text-2xl font-bold text-zinc-100">
                    {adherence.completedSessions} / {adherence.plannedSessions}
                </p>

                <p className="text-sm text-zinc-400">Entrenamientos en últimas 4 semanas</p>

                <p className="text-xl font-semibold text-indigo-400">
                    {adherence.percentage}%
                </p>

                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${progressWidth}%` }}
                    />
                </div>

                {adherence.plannedSessions === 0 && (
                    <p className="text-sm text-zinc-500">
                        No hay rutina asignada o no se pudieron calcular sesiones planificadas.
                    </p>
                )}
            </div>
        </div>
    )
}