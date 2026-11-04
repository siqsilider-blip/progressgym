import MuscleBodyMap from '@/components/MuscleBodyMap'
import { muscleLabel, resolveExerciseMuscles } from '@/lib/exerciseMuscles'

type Props = {
    exerciseName: string
    muscleGroup?: string | null
    category?: string | null
}

export default function ExerciseMuscleSummary({ exerciseName, muscleGroup, category }: Props) {
    const profile = resolveExerciseMuscles({ name: exerciseName, muscleGroup, category })
    const hasClassification = profile.primary.length > 0

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card p-4" aria-labelledby="exercise-muscles-title">
            <div>
                <p className="text-xs font-semibold text-indigo-400">Mapa corporal</p>
                <h3 id="exercise-muscles-title" className="mt-0.5 text-lg font-bold text-foreground">Músculos trabajados</h3>
            </div>

            {hasClassification ? (
                <div className="mt-4">
                    <div className="rounded-2xl border border-white/[0.06] bg-background/55 px-2 py-3">
                        <MuscleBodyMap primary={profile.primary} secondary={profile.secondary} />
                    </div>

                    <div className={`mt-3 grid gap-2 ${profile.secondary.length > 0 ? 'sm:grid-cols-2' : ''}`}>
                        <div className="min-w-0 rounded-xl border border-violet-500/25 bg-violet-500/[0.08] px-3.5 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                <span className="h-3 w-3 shrink-0 rounded-full bg-violet-600 ring-2 ring-violet-300/30" aria-hidden="true" />
                                Trabajo principal
                            </div>
                            <p className="mt-1.5 break-words text-base font-bold leading-6 text-foreground">
                                {profile.primary.map(muscleLabel).join(' · ')}
                            </p>
                        </div>

                        {profile.secondary.length > 0 && (
                            <div className="min-w-0 rounded-xl border border-violet-300/15 bg-violet-300/[0.05] px-3.5 py-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <span className="h-3 w-3 shrink-0 rounded-full bg-violet-300" aria-hidden="true" />
                                    Músculos que ayudan
                                </div>
                                <p className="mt-1.5 break-words text-sm font-medium leading-6 text-foreground/80">
                                    {profile.secondary.map(muscleLabel).join(' · ')}
                                </p>
                            </div>
                        )}
                    </div>

                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Violeta intenso: principal · Violeta claro: músculos de apoyo.
                    </p>
                </div>
            ) : (
                <p className="mt-3 rounded-xl bg-muted/50 px-3 py-3 text-sm leading-6 text-muted-foreground">
                    Este ejercicio todavía no tiene un grupo muscular asignado. Tu entrenador puede clasificarlo desde la biblioteca de ejercicios.
                </p>
            )}

        </section>
    )
}
