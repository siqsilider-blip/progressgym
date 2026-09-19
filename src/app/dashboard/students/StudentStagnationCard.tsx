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
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
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
