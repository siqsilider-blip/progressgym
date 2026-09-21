'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronUp, Clock3, Save, Trophy } from 'lucide-react'
import { completeSession, saveSessionNote, saveSet } from '@/app/dashboard/students/[studentId]/train/train-focused-actions'
import ExerciseDemo from '@/app/dashboard/students/[studentId]/train/ExerciseDemo'

type RoutineBlock = 'activation' | 'main' | 'closing'

type ExerciseData = {
    id: string
    exerciseId: string | null
    exerciseName: string
    isCardio: boolean
    setsCount: number
    targetReps: string | null
    restSeconds: number
    previousWeights: (number | null)[]
    previousReps: (number | null)[]
    currentWeights: (number | null)[]
    currentReps: (number | null)[]
    currentRpes: (number | null)[]
    lastPerformedAt?: string | null
    video_url?: string | null
    instructions?: string | null
    block: RoutineBlock
}

type SetState = {
    weight: string
    reps: string
    rpe: string
    saved: boolean
    dirty: boolean
    isPr: boolean
    error: string | null
}

type Props = {
    sessionId: string
    studentId: string
    studentName: string
    dayLabel: string
    routineName: string
    performedAt: string
    exercises: ExerciseData[]
    maxWeights: Record<string, number>
    weightUnit: string
    returnHref: string
    returnLabel?: string
    routineHref?: string
    progressHref: string
    showPrs?: boolean
    initialSummary?: boolean
}

const BLOCKS: { id: RoutineBlock; label: string; emoji: string }[] = [
    { id: 'activation', label: 'Activación', emoji: '⚡' },
    { id: 'main', label: 'Bloque principal', emoji: '💪' },
    { id: 'closing', label: 'Cierre', emoji: '🧘' },
]

const APP_BOTTOM_NAV_HEIGHT_PX = 72

function createInitialSets(exercises: ExerciseData[]): SetState[][] {
    return exercises.map((exercise) =>
        Array.from({ length: exercise.setsCount }, (_, index) => {
            const weight = exercise.currentWeights[index]
            const reps = exercise.currentReps[index]
            const rpe = exercise.currentRpes[index]
            const saved = weight != null || reps != null

            return {
                weight: weight != null ? String(weight) : '',
                reps: reps != null ? String(reps) : '',
                rpe: rpe != null ? String(rpe) : '',
                saved,
                dirty: false,
                isPr: false,
                error: null,
            }
        })
    )
}

function formatDuration(seconds: number | null) {
    if (seconds == null) return 'Duración no disponible'
    const minutes = Math.max(1, Math.round(seconds / 60))
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
}

export default function StudentWorkoutView({
    sessionId,
    studentId,
    dayLabel,
    routineName,
    performedAt,
    exercises,
    maxWeights,
    weightUnit,
    returnHref,
    returnLabel = 'Volver a la rutina',
    routineHref = returnHref,
    progressHref,
    showPrs = true,
    initialSummary = false,
}: Props) {
    const router = useRouter()
    const [sets, setSets] = React.useState<SetState[][]>(() => createInitialSets(exercises))
    const [openExerciseId, setOpenExerciseId] = React.useState<string | null>(() => {
        const firstIncomplete = exercises.find((exercise, exerciseIndex) =>
            setsForExerciseIncomplete(exercise, createInitialSets(exercises)[exerciseIndex])
        )
        return firstIncomplete?.id ?? exercises[0]?.id ?? null
    })
    const [savingKey, setSavingKey] = React.useState<string | null>(null)
    const [finishing, setFinishing] = React.useState(false)
    const [globalError, setGlobalError] = React.useState<string | null>(null)
    const [restTimeLeft, setRestTimeLeft] = React.useState(0)
    const [restExerciseName, setRestExerciseName] = React.useState('')
    const [completedSession, setCompletedSession] = React.useState(initialSummary)
    const [summary, setSummary] = React.useState<{ durationSeconds: number | null; totalSets: number } | null>(null)
    const [sessionNote, setSessionNote] = React.useState('')
    const [savingNote, setSavingNote] = React.useState(false)
    const [noteSaved, setNoteSaved] = React.useState(false)
    const [localMaxWeights, setLocalMaxWeights] = React.useState({ ...maxWeights })

    const totalPlannedSets = exercises.reduce((total, exercise) => total + exercise.setsCount, 0)
    const savedSets = sets.reduce((total, exerciseSets) => total + exerciseSets.filter((set) => set.saved).length, 0)
    const progress = totalPlannedSets > 0 ? Math.round((savedSets / totalPlannedSets) * 100) : 0

    React.useEffect(() => {
        if (restTimeLeft <= 0) return
        const timer = window.setInterval(() => {
            setRestTimeLeft((value) => Math.max(0, value - 1))
        }, 1000)
        return () => window.clearInterval(timer)
    }, [restTimeLeft])

    function updateField(exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', value: string) {
        setSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
            currentExerciseIndex !== exerciseIndex
                ? exerciseSets
                : exerciseSets.map((set, currentSetIndex) =>
                    currentSetIndex !== setIndex
                        ? set
                        : { ...set, [field]: value, dirty: true, error: null }
                )
        ))
        setGlobalError(null)
        setNoteSaved(false)
    }

    async function saveOneSet(exerciseIndex: number, setIndex: number) {
        const exercise = exercises[exerciseIndex]
        const set = sets[exerciseIndex]?.[setIndex]
        if (!exercise || !set || savingKey) return

        const weight = set.weight.trim() === '' ? null : Number(set.weight)
        const reps = set.reps.trim() === '' ? null : Number(set.reps)
        const rpe = set.rpe.trim() === '' ? null : Number(set.rpe)

        if (weight === null && reps === null) {
            setSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                currentExerciseIndex !== exerciseIndex
                    ? exerciseSets
                    : exerciseSets.map((item, currentSetIndex) =>
                        currentSetIndex === setIndex
                            ? { ...item, error: exercise.isCardio ? 'Ingresá el tiempo realizado.' : 'Ingresá peso o repeticiones.' }
                            : item
                    )
            ))
            return
        }

        const key = `${exerciseIndex}-${setIndex}`
        setSavingKey(key)
        setGlobalError(null)

        try {
            const result = await saveSet({
                sessionId,
                studentId,
                routineDayExerciseId: exercise.id,
                setIndex,
                weight,
                reps,
                rpe,
                performedAt,
            })

            if (!result.ok) {
                setSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                    currentExerciseIndex !== exerciseIndex
                        ? exerciseSets
                        : exerciseSets.map((item, currentSetIndex) =>
                            currentSetIndex === setIndex ? { ...item, error: result.error || 'No se pudo guardar.' } : item
                        )
                ))
                return
            }

            const oldMax = localMaxWeights[exercise.id] ?? 0
            const isPr = showPrs && weight != null && weight > oldMax
            if (isPr && weight != null) {
                setLocalMaxWeights((previous) => ({ ...previous, [exercise.id]: weight }))
            }

            setSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                currentExerciseIndex !== exerciseIndex
                    ? exerciseSets
                    : exerciseSets.map((item, currentSetIndex) =>
                        currentSetIndex === setIndex
                            ? { ...item, saved: true, dirty: false, isPr, error: null }
                            : item
                    )
            ))

            if (!completedSession && !set.saved && exercise.restSeconds > 0) {
                setRestExerciseName(exercise.exerciseName)
                setRestTimeLeft(exercise.restSeconds)
            }
        } catch {
            setGlobalError('No pudimos guardar. Revisá tu conexión e intentá nuevamente.')
        } finally {
            setSavingKey(null)
        }
    }

    async function finishWorkout() {
        if (finishing) return
        const hasUnsavedValues = sets.some((exerciseSets) => exerciseSets.some((set) => set.dirty))
        if (hasUnsavedValues) {
            setGlobalError('Hay cambios sin guardar. Guardá las series marcadas antes de finalizar.')
            return
        }
        if (savedSets === 0) {
            setGlobalError('Guardá al menos una serie antes de finalizar el entrenamiento.')
            return
        }

        setFinishing(true)
        setGlobalError(null)
        const result = await completeSession({ sessionId, studentId })
        setFinishing(false)

        if (!result.ok) {
            setGlobalError(result.error || 'No pudimos finalizar el entrenamiento.')
            return
        }

        setCompletedSession(true)
        setSummary({ durationSeconds: result.durationSeconds, totalSets: result.totalSets })
        setRestTimeLeft(0)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function saveNote() {
        setSavingNote(true)
        setNoteSaved(false)
        const result = await saveSessionNote({ sessionId, studentId, note: sessionNote })
        setSavingNote(false)
        if (result.ok) setNoteSaved(true)
        else setGlobalError(result.error || 'No pudimos guardar la nota.')
    }

    if (summary) {
        return (
            <main className="mx-auto max-w-lg px-4 py-6">
                <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                        <Check className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h1 className="mt-3 text-xl font-black text-foreground">Entrenamiento guardado</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{dayLabel} · {summary.totalSets} series · {formatDuration(summary.durationSeconds)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Si necesitás corregir un peso, podés volver a abrir este día.</p>
                </section>

                <section className="mt-4 rounded-2xl border border-border bg-card p-4">
                    <label className="text-sm font-semibold text-foreground" htmlFor="session-note">¿Cómo te sentiste? (opcional)</label>
                    <textarea
                        id="session-note"
                        value={sessionNote}
                        onChange={(event) => { setSessionNote(event.target.value); setNoteSaved(false) }}
                        placeholder="Ej.: me sentí con energía, molestia en la rodilla..."
                        className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-indigo-500"
                    />
                    <button type="button" onClick={saveNote} disabled={savingNote} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-secondary px-4 text-sm font-semibold text-foreground disabled:opacity-50">
                        {savingNote ? 'Guardando…' : noteSaved ? 'Nota guardada ✓' : 'Guardar nota'}
                    </button>
                </section>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => router.push(routineHref)} className="min-h-12 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">Ver rutina</button>
                    <button type="button" onClick={() => router.push(progressHref)} className="min-h-12 rounded-xl border border-border bg-secondary px-4 text-sm font-bold text-foreground">Ver progreso</button>
                </div>
            </main>
        )
    }

    return (
        <main className="mx-auto max-w-lg px-4 pb-40 pt-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-indigo-400">{routineName}</p>
                    <h1 className="text-xl font-black text-foreground">{dayLabel}</h1>
                </div>
                {completedSession && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-500">Finalizada · editable</span>
                )}
            </div>

            <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{savedSets} de {totalPlannedSets} series guardadas</span>
                    <span>{progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {completedSession && (
                <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2 text-xs leading-5 text-emerald-500">
                    Esta sesión ya terminó. Podés corregir cualquier peso o repetición y guardar la serie nuevamente; la duración original no cambia.
                </p>
            )}

            {restTimeLeft > 0 && (
                <div className="sticky top-[86px] z-20 mt-3 flex items-center gap-3 rounded-xl border border-indigo-500/25 bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur">
                    <Clock3 className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">Descanso · {restTimeLeft}s</p>
                        <p className="truncate text-[10px] text-muted-foreground">{restExerciseName}</p>
                    </div>
                    <button type="button" onClick={() => setRestTimeLeft(0)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground">Omitir</button>
                </div>
            )}

            <div className="mt-4 space-y-5">
                {BLOCKS.map((block) => {
                    const blockExercises = exercises
                        .map((exercise, index) => ({ exercise, index }))
                        .filter(({ exercise }) => exercise.block === block.id)
                    if (blockExercises.length === 0) return null

                    return (
                        <section key={block.id}>
                            <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-muted-foreground">{block.emoji} {block.label}</h2>
                            <div className="space-y-2">
                                {blockExercises.map(({ exercise, index: exerciseIndex }) => {
                                    const exerciseSets = sets[exerciseIndex] ?? []
                                    const completed = exerciseSets.filter((set) => set.saved).length
                                    const isOpen = openExerciseId === exercise.id

                                    return (
                                        <article key={exercise.id} className={`overflow-hidden rounded-2xl border bg-card ${isOpen ? 'border-indigo-500/35' : 'border-border'}`}>
                                            <button
                                                type="button"
                                                onClick={() => setOpenExerciseId(isOpen ? null : exercise.id)}
                                                className="flex min-h-16 w-full items-center gap-3 px-3.5 py-3 text-left"
                                                aria-expanded={isOpen}
                                            >
                                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${completed === exercise.setsCount ? 'bg-emerald-500 text-white' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                                    {completed === exercise.setsCount ? '✓' : exerciseIndex + 1}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-bold text-foreground">{exercise.exerciseName}</span>
                                                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                                        {exercise.setsCount} series{exercise.targetReps ? ` · objetivo ${exercise.targetReps}${exercise.isCardio ? ' min' : ' reps'}` : ''} · {completed}/{exercise.setsCount} guardadas
                                                    </span>
                                                </span>
                                                {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-border px-3.5 pb-3.5 pt-3">
                                                    {exercise.video_url && (
                                                        <ExerciseDemo exerciseName={exercise.exerciseName} videoUrl={exercise.video_url} instructions={exercise.instructions} />
                                                    )}
                                                    {!exercise.video_url && exercise.instructions?.trim() && (
                                                        <p className="mb-3 rounded-xl bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">{exercise.instructions}</p>
                                                    )}

                                                    <div className="mt-3 space-y-2.5">
                                                        {exerciseSets.map((set, setIndex) => {
                                                            const key = `${exerciseIndex}-${setIndex}`
                                                            return (
                                                                <div key={setIndex} className={`rounded-xl border p-3 ${set.dirty ? 'border-amber-500/35 bg-amber-500/[0.04]' : set.saved ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-border bg-background/50'}`}>
                                                                    <div className="mb-2 flex items-center justify-between">
                                                                        <p className="text-xs font-bold text-foreground">Serie {setIndex + 1}</p>
                                                                        <span className={`text-[10px] font-bold ${set.dirty ? 'text-amber-500' : set.saved ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                                                            {set.dirty ? 'Sin guardar' : set.saved ? 'Guardada ✓' : 'Pendiente'}
                                                                        </span>
                                                                    </div>

                                                                    <div className={`grid gap-2 ${exercise.isCardio ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                                        {!exercise.isCardio && (
                                                                            <label>
                                                                                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Peso ({weightUnit})</span>
                                                                                <input
                                                                                    type="number"
                                                                                    inputMode="decimal"
                                                                                    step="0.5"
                                                                                    placeholder="Escribir"
                                                                                    value={set.weight}
                                                                                    onChange={(event) => updateField(exerciseIndex, setIndex, 'weight', event.target.value)}
                                                                                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-center text-base font-bold text-foreground outline-none focus:border-indigo-500"
                                                                                />
                                                                                <span className="mt-1 block text-[10px] text-muted-foreground">
                                                                                    {exercise.previousWeights[setIndex] != null ? `Anterior: ${exercise.previousWeights[setIndex]} ${weightUnit}` : 'Sin registro anterior'}
                                                                                </span>
                                                                            </label>
                                                                        )}

                                                                        <label>
                                                                            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{exercise.isCardio ? 'Tiempo (min)' : 'Repeticiones'}</span>
                                                                            <input
                                                                                type="number"
                                                                                inputMode="numeric"
                                                                                placeholder="Escribir"
                                                                                value={set.reps}
                                                                                onChange={(event) => updateField(exerciseIndex, setIndex, 'reps', event.target.value)}
                                                                                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-center text-base font-bold text-foreground outline-none focus:border-indigo-500"
                                                                            />
                                                                            <span className="mt-1 block text-[10px] text-muted-foreground">
                                                                                {exercise.previousReps[setIndex] != null
                                                                                    ? `Anterior: ${exercise.previousReps[setIndex]} ${exercise.isCardio ? 'min' : 'reps'}`
                                                                                    : exercise.targetReps ? `Objetivo: ${exercise.targetReps}` : 'Sin registro anterior'}
                                                                            </span>
                                                                        </label>
                                                                    </div>

                                                                    <div className="mt-2 flex items-end gap-2">
                                                                        <label className="min-w-0 flex-1">
                                                                            <span className="mb-1 block text-[10px] text-muted-foreground">Esfuerzo opcional</span>
                                                                            <select
                                                                                value={set.rpe}
                                                                                onChange={(event) => updateField(exerciseIndex, setIndex, 'rpe', event.target.value)}
                                                                                className="h-10 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-indigo-500"
                                                                            >
                                                                                <option value="">Sin indicar</option>
                                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => <option key={value} value={value}>{value}/10</option>)}
                                                                            </select>
                                                                        </label>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => saveOneSet(exerciseIndex, setIndex)}
                                                                            disabled={savingKey != null || (!set.dirty && set.saved)}
                                                                            className="inline-flex h-10 min-w-32 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-45"
                                                                        >
                                                                            {savingKey === key ? 'Guardando…' : set.saved ? <><Save className="h-3.5 w-3.5" />Actualizar</> : 'Guardar serie'}
                                                                        </button>
                                                                    </div>

                                                                    {set.isPr && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-500"><Trophy className="h-3.5 w-3.5" /> Nuevo mejor peso</p>}
                                                                    {set.error && <p className="mt-2 text-[11px] font-medium text-red-500">{set.error}</p>}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    )
                                })}
                            </div>
                        </section>
                    )
                })}
            </div>

            <div
                className="fixed left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur"
                style={{ bottom: `calc(${APP_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))` }}
            >
                {globalError && <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-xs font-medium text-red-500">{globalError}</p>}
                <div className="mx-auto flex max-w-lg gap-2 px-4 py-3">
                    <button type="button" onClick={() => router.push(returnHref)} className={`min-h-12 rounded-xl border border-border bg-secondary px-4 text-sm font-semibold text-foreground ${completedSession ? 'flex-1' : ''}`}>{returnLabel}</button>
                    {!completedSession && (
                        <button type="button" onClick={finishWorkout} disabled={finishing} className="min-h-12 flex-1 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                            {finishing ? 'Finalizando…' : 'Finalizar entrenamiento'}
                        </button>
                    )}
                </div>
            </div>
        </main>
    )
}

function setsForExerciseIncomplete(exercise: ExerciseData, sets: SetState[]) {
    return sets.filter((set) => set.saved).length < exercise.setsCount
}
