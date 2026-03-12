import type { StudentStagnation } from './getStudentStagnation'

export default function StudentStagnationCard({
    stagnation,
}: {
    stagnation: StudentStagnation
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Estancamiento
            </h2>

            {stagnation.detected ? (
                <div className="space-y-2">
                    <p className="text-xl font-semibold text-zinc-100">
                        {stagnation.exerciseName}
                    </p>

                    <p className="text-2xl font-bold text-yellow-400">
                        {stagnation.daysWithoutImprovement} días
                    </p>

                    <p className="text-sm text-zinc-400">
                        Sin mejorar desde su mejor marca de {stagnation.lastBestWeight} kg
                    </p>
                </div>
            ) : (
                <p className="text-sm text-zinc-400">
                    No se detecta estancamiento relevante por ahora.
                </p>
            )}
        </div>
    )
}