type StudentExercisePR = {
    exercise_name: string
    weight: number
    reps: number | null
    performed_at: string | null
}

type StudentExercisePRsCardProps = {
    prs: StudentExercisePR[]
}

export default function StudentExercisePRsCard({
    prs,
}: StudentExercisePRsCardProps) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                PRs históricos por ejercicio
            </h2>

            {prs.length === 0 ? (
                <p className="text-sm text-zinc-400">
                    Todavía no hay PRs registrados para este alumno.
                </p>
            ) : (
                <div className="space-y-3">
                    {prs.map((pr, i) => (
                        <div
                            key={`${pr.exercise_name}-${i}`}
                            className="flex items-center justify-between border-b border-zinc-800 pb-3"
                        >
                            <div>
                                <p className="font-medium text-zinc-100">{pr.exercise_name}</p>
                                <p className="text-sm text-zinc-400">
                                    {pr.reps ?? 0} reps
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="font-bold text-zinc-100">{pr.weight} kg</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}