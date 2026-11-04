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
        <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby="exercise-muscles-title">
            <div>
                <p className="text-xs font-semibold text-indigo-400">Mapa corporal</p>
                <h3 id="exercise-muscles-title" className="text-base font-bold text-foreground">Qué trabajás</h3>
            </div>

            {hasClassification ? (
                <div className="mt-3 grid grid-cols-[minmax(7.5rem,9.5rem)_minmax(0,1fr)] items-center gap-3">
                    <MuscleBodyMap primary={profile.primary} secondary={profile.secondary} />
                    <div className="min-w-0 space-y-4">
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                <span className="h-2.5 w-2.5 rounded-full bg-violet-600" aria-hidden="true" />
                                Principal
                            </div>
                            <p className="mt-1 text-sm font-bold leading-5 text-foreground">
                                {profile.primary.map(muscleLabel).join(' · ')}
                            </p>
                        </div>

                        {profile.secondary.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    <span className="h-2.5 w-2.5 rounded-full bg-violet-300" aria-hidden="true" />
                                    También participan
                                </div>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {profile.secondary.map(muscleLabel).join(' · ')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <p className="mt-3 rounded-xl bg-muted/50 px-3 py-3 text-sm leading-6 text-muted-foreground">
                    Este ejercicio todavía no tiene un grupo muscular asignado. Tu entrenador puede clasificarlo desde la biblioteca de ejercicios.
                </p>
            )}

            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                El color fuerte muestra el trabajo principal; el claro, los músculos que ayudan durante el movimiento.
            </p>
        </section>
    )
}
