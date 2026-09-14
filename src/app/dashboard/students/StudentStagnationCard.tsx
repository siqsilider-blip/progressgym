import type { StudentStagnationItem } from './getStudentStagnation'

type Props = {
    stagnation: StudentStagnationItem[]
}

export default function StudentStagnationCard({ stagnation }: Props) {
    const mostStagnant = stagnation[0]

    if (!mostStagnant) {
        return null
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Estancamiento
            </p>

            <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                {mostStagnant.exerciseName}
            </p>

            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {mostStagnant.sessionsWithoutImprovement} sesiones sin mejorar
                {` · Mejor: ${mostStagnant.bestWeight}`}
            </p>
        </div>
    )
}
