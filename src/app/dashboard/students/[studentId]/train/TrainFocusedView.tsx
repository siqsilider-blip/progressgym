'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { saveSet, completeSession, saveSessionNote } from './train-focused-actions'
import ExerciseDemo from './ExerciseDemo'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SetStatus = 'pending' | 'active' | 'completed' | 'skipped'

type SetState = {
    setIndex: number
    status: SetStatus
    weight: string
    reps: string
    rpe: string
    saved: boolean
    isPR: boolean
}

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
    lastPerformedAt?: string | null
    video_url?: string | null
    instructions?: string | null
    block?: string
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
    initialPhase?: Phase
}

type Phase = 'training' | 'rest' | 'transition' | 'summary'

type PostConfirmDecision =
    | { next: 'rest'; restSeconds: number }
    | { next: 'transition' }
    | { next: 'finish' }

// Altura aproximada de la bottom nav global de la app
const APP_BOTTOM_NAV_HEIGHT_PX = 72

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TrainFocusedView({
    sessionId,
    studentId,
    studentName,
    dayLabel,
    routineName,
    performedAt,
    exercises,
    maxWeights: initialMaxWeights,
    weightUnit,
    returnHref,
    returnLabel = 'Ir al perfil',
    routineHref,
    progressHref,
    showPrs = true,
    initialPhase,
}: Props) {
    const router = useRouter()

    // ── Core state ──
    const [currentExerciseIndex, setCurrentExerciseIndex] = React.useState(0)
    const [showRpeInfo, setShowRpeInfo] = React.useState(false)
    const [editingCompletedSetIndex, setEditingCompletedSetIndex] = React.useState<number | null>(null)
    const [sets, setSets] = React.useState<SetState[][]>(() => initAllSets(exercises))
    const [phase, setPhase] = React.useState<Phase>(initialPhase ?? 'training')
    const [saving, setSaving] = React.useState(false)
    const [saveError, setSaveError] = React.useState<string | null>(null)
    const [prsThisSession, setPrsThisSession] = React.useState(0)
    const [completedSetsTotal, setCompletedSetsTotal] = React.useState(0)

    // ── Estado local para máximos históricos ──
    const [localMaxWeights, setLocalMaxWeights] = React.useState<Record<string, number>>(
        () => ({ ...initialMaxWeights })
    )

    // ── Rest timer state ──
    const [restTimeLeft, setRestTimeLeft] = React.useState(0)
    const [restBaseSeconds, setRestBaseSeconds] = React.useState(60)

    // ── Summary state ──
    const [summaryData, setSummaryData] = React.useState<{
        durationSeconds: number | null
        totalSets: number
    } | null>(null)
    const [sessionNote, setSessionNote] = React.useState('')
    const [savingNote, setSavingNote] = React.useState(false)
    const [noteSaved, setNoteSaved] = React.useState(false)

    // ── PR flash ──
    const [prFlash, setPrFlash] = React.useState(false)

    // ── Set confirmed flash ──
    const [setFlash, setSetFlash] = React.useState<string | null>(null)

    // ── Refs para inputs ──
    const weightInputRef = React.useRef<HTMLInputElement>(null)
    const repsInputRef = React.useRef<HTMLInputElement>(null)

    const exercise = exercises[currentExerciseIndex]
    const exerciseSets = sets[currentExerciseIndex] ?? []
    const activeSetIndex = exerciseSets.findIndex((s) => s.status === 'active')
    const activeSet = activeSetIndex >= 0 ? exerciseSets[activeSetIndex] : null

    const totalExercises = exercises.length

    const allExercisesDone = sets.every((exSets) =>
        exSets.every((s) => s.status === 'completed' || s.status === 'skipped')
    )

    React.useEffect(() => {
        if (phase !== 'rest' || restTimeLeft <= 0) return

        const interval = setInterval(() => {
            setRestTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval)
                    handleRestFinished()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [phase, restTimeLeft])

    React.useEffect(() => {
        setEditingCompletedSetIndex(null)
        setShowRpeInfo(false)
    }, [currentExerciseIndex])

    function initAllSets(exs: ExerciseData[]): SetState[][] {
        return exs.map((ex) => {
            const setsArr: SetState[] = []
            for (let i = 0; i < ex.setsCount; i++) {
                const prevWeight = ex.previousWeights[i]
                const prevReps = ex.previousReps[i]
                setsArr.push({
                    setIndex: i,
                    status: i === 0 ? 'active' : 'pending',
                    weight: prevWeight != null ? String(prevWeight) : '',
                    reps: prevReps != null ? String(prevReps) : '',
                    rpe: '',
                    saved: false,
                    isPR: false,
                })
            }
            return setsArr
        })
    }

    function updateSetField(setIdx: number, field: 'weight' | 'reps', value: string) {
        setSets((prev) => {
            const copy = prev.map((exSets) => exSets.map((s) => ({ ...s })))
            copy[currentExerciseIndex][setIdx][field] = value
            return copy
        })
    }

    function updateSetRpe(setIdx: number, value: string) {
        setSets((prev) => {
            const copy = prev.map((exSets) => exSets.map((s) => ({ ...s })))
            copy[currentExerciseIndex][setIdx].rpe = value
            return copy
        })
    }

    async function confirmSet(targetSetIndex?: number) {
        if (saving) return

        const setIdx = targetSetIndex ?? activeSetIndex
        if (setIdx < 0) return

        const targetSet = exerciseSets[setIdx]
        if (!targetSet) return

        const weightVal = targetSet.weight.trim() !== '' ? Number(targetSet.weight) : null
        const repsVal = targetSet.reps.trim() !== '' ? Number(targetSet.reps) : null
        const rpeVal = targetSet.rpe.trim() !== '' ? Number(targetSet.rpe) : null

        if (weightVal === null && repsVal === null) {
            setSaveError(exercise.isCardio
                ? 'Ingresá el tiempo realizado antes de guardar.'
                : 'Ingresá el peso o las repeticiones antes de guardar.')
            return
        }

        setSaving(true)
        setSaveError(null)

        let result: Awaited<ReturnType<typeof saveSet>>
        try {
            result = await saveSet({
                sessionId,
                studentId,
                routineDayExerciseId: exercise.id,
                setIndex: targetSet.setIndex,
                weight: weightVal,
                reps: repsVal,
                rpe: rpeVal,
                performedAt,
            })
        } catch {
            setSaving(false)
            setSaveError('No pudimos guardar. Revisá tu conexión y tocá nuevamente.')
            return
        }

        setSaving(false)

        if (!result.ok) {
            console.error('Error saving set:', result.error)
            setSaveError(result.error || 'No pudimos guardar esta serie. Intentá nuevamente.')
            return
        }

        const currentMax = localMaxWeights[exercise.id] ?? 0
        const isPR = weightVal !== null && weightVal > currentMax

        if (isPR) {
            setLocalMaxWeights((prev) => ({
                ...prev,
                [exercise.id]: weightVal!,
            }))
            setPrsThisSession((prev) => prev + 1)
            setPrFlash(true)
            setTimeout(() => setPrFlash(false), 1500)
        }

        if (targetSet.status === 'completed') {
            setSets((prev) => {
                const copy = prev.map((exSets) => exSets.map((s) => ({ ...s })))
                copy[currentExerciseIndex][setIdx].saved = true
                copy[currentExerciseIndex][setIdx].isPR = isPR
                return copy
            })
            setEditingCompletedSetIndex(null)
            return
        }

        if (!isPR) {
            setSetFlash(`Serie ${setIdx + 1} completada`)
            setTimeout(() => setSetFlash(null), 900)
        }

        const capturedExerciseIndex = currentExerciseIndex
        const capturedActiveSetIndex = activeSetIndex
        const capturedRestSeconds = exercise.restSeconds
        const wasOriginallyActive = setIdx === capturedActiveSetIndex

        // ── Compute decision BEFORE setSets to avoid React 18 scheduling race ──
        // postConfirmDecisionRef was fragile: the updater could run after
        // the setTimeout(0), leaving the ref null and skipping startRest.
        let decision: PostConfirmDecision | null = null

        if (wasOriginallyActive) {
            const hasMoreSets = exerciseSets.some(
                (s, i) => i > setIdx && (s.status === 'pending' || s.status === 'active')
            )

            if (hasMoreSets) {
                decision = { next: 'rest', restSeconds: capturedRestSeconds }
            } else {
                const allDoneAfterThis = sets.every((exSets, i) => {
                    if (i === capturedExerciseIndex) {
                        return exSets.every((s, j) =>
                            j === setIdx || s.status === 'completed' || s.status === 'skipped'
                        )
                    }
                    return exSets.every((s) => s.status === 'completed' || s.status === 'skipped')
                })
                decision = allDoneAfterThis ? { next: 'finish' } : { next: 'transition' }
            }

        }

        setSets((prev) => {
            const copy = prev.map((exSets) => exSets.map((s) => ({ ...s })))
            const exSets = copy[capturedExerciseIndex]

            exSets[setIdx].status = 'completed'
            exSets[setIdx].saved = true
            exSets[setIdx].isPR = isPR

            if (wasOriginallyActive) {
                const nextPending = exSets.findIndex(
                    (s, i) => i > setIdx && s.status === 'pending'
                )
                if (nextPending >= 0) {
                    exSets[nextPending].status = 'active'
                }
            }

            return copy
        })

        setCompletedSetsTotal((prev) =>
            targetSet.status === 'completed' ? prev : prev + 1
        )

        if (!wasOriginallyActive) return
        if (!decision) return

        await new Promise((resolve) => setTimeout(resolve, 0))

        switch (decision.next) {
            case 'rest':
                startRest(decision.restSeconds)
                break
            case 'transition':
                setPhase('transition')
                break
            case 'finish':
                await finishSession()
                break
        }
    }

    function handleWeightKeyDown(
        e: React.KeyboardEvent<HTMLInputElement>,
        setIdx: number
    ) {
        if (e.key === 'Enter') {
            e.preventDefault()

            if (setIdx !== activeSetIndex) return

            repsInputRef.current?.focus()
        }
    }

    function handleRepsKeyDown(
        e: React.KeyboardEvent<HTMLInputElement>,
        setIdx: number
    ) {
        if (e.key === 'Enter') {
            e.preventDefault()

            // No confirmar con Enter desde repes.
            // Solo evitamos submit/comportamientos raros.
            if (setIdx !== activeSetIndex) return

                ; (e.currentTarget as HTMLInputElement).blur()
        }
    }

    function skipSet() {
        if (activeSetIndex < 0) return

        const capturedExerciseIndex = currentExerciseIndex
        const capturedActiveSetIndex = activeSetIndex

        // Compute decision before setSets — same fix as confirmSet
        const hasMoreSets = exerciseSets.some(
            (s, i) => i > capturedActiveSetIndex && (s.status === 'pending' || s.status === 'active')
        )

        let decision: PostConfirmDecision | null = null
        if (!hasMoreSets) {
            const allDoneAfterThis = sets.every((exSets, i) => {
                if (i === capturedExerciseIndex) {
                    return exSets.every((s, j) =>
                        j === capturedActiveSetIndex || s.status === 'completed' || s.status === 'skipped'
                    )
                }
                return exSets.every((s) => s.status === 'completed' || s.status === 'skipped')
            })
            if (allDoneAfterThis) {
                decision = { next: 'finish' }
            } else if (capturedExerciseIndex < exercises.length - 1) {
                decision = { next: 'transition' }
            }
        }

        setSets((prev) => {
            const copy = prev.map((exSets) => exSets.map((s) => ({ ...s })))
            const exSets = copy[capturedExerciseIndex]

            exSets[capturedActiveSetIndex].status = 'skipped'

            const nextPending = exSets.findIndex(
                (s, i) => i > capturedActiveSetIndex && s.status === 'pending'
            )
            if (nextPending >= 0) {
                exSets[nextPending].status = 'active'
            }

            return copy
        })

        if (!decision) return

        setTimeout(() => {
            switch (decision!.next) {
                case 'transition':
                    setPhase('transition')
                    break
                case 'finish':
                    finishSession()
                    break
            }
        }, 0)
    }

    function startRest(seconds: number) {
        setRestBaseSeconds(seconds)
        setRestTimeLeft(seconds)
        setPhase('rest')
    }

    function handleRestFinished() {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(300)
        }
        setPhase('training')
    }

    function skipRest() {
        setRestTimeLeft(0)
        setPhase('training')
    }

    function goToNextExercise() {
        if (currentExerciseIndex < totalExercises - 1) {
            const nextIdx = currentExerciseIndex + 1

            setSets((prev) => {
                const copy = prev.map((exSets) => exSets.map((s) => ({ ...s })))
                const nextSets = copy[nextIdx]
                const hasActive = nextSets.some((s) => s.status === 'active')
                if (!hasActive) {
                    const firstPending = nextSets.findIndex((s) => s.status === 'pending')
                    if (firstPending >= 0) {
                        nextSets[firstPending].status = 'active'
                    }
                }
                return copy
            })

            setCurrentExerciseIndex(nextIdx)
            setPhase('training')
        }
    }

    async function finishSession() {
        setSaving(true)
        const result = await completeSession({ sessionId, studentId })
        setSaving(false)

        if (result.ok) {
            setSummaryData({
                durationSeconds: result.durationSeconds,
                totalSets: result.totalSets,
            })
            setPhase('summary')
        } else {
            console.error('Error completing session:', result.error)
        }
    }

    function goToExercise(index: number) {
        setSets((prev) => {
            const copy = prev.map((exSets) => exSets.map((s) => ({ ...s })))
            const targetSets = copy[index]
            const hasActive = targetSets.some((s) => s.status === 'active')
            if (!hasActive) {
                const firstPending = targetSets.findIndex((s) => s.status === 'pending')
                if (firstPending >= 0) {
                    targetSets[firstPending].status = 'active'
                }
            }
            return copy
        })
        setCurrentExerciseIndex(index)
        setPhase('training')
    }

    function formatTime(seconds: number) {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    function formatDuration(totalSeconds: number) {
        const mins = Math.floor(totalSeconds / 60)
        const secs = totalSeconds % 60
        if (mins === 0) return `${secs}s`
        return `${mins}m ${secs}s`
    }

    async function saveNote() {
        if (!sessionNote.trim()) return
        setSavingNote(true)
        await saveSessionNote({ sessionId, studentId, note: sessionNote })
        setSavingNote(false)
        setNoteSaved(true)
        setTimeout(() => setNoteSaved(false), 2000)
    }

    if (phase === 'summary') {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                onClick={() => setPhase('training')}
            >
                <div
                    className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-500/20">
                            💪
                        </div>
                        <h2 className="mt-4 text-2xl font-bold text-card-foreground">
                            Sesión completada
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {studentName} · {dayLabel}
                        </p>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-secondary p-3 text-center">
                            <p className="text-2xl font-bold text-card-foreground">
                                {summaryData?.totalSets ?? completedSetsTotal}
                            </p>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Series
                            </p>
                        </div>
                        <div className="rounded-2xl bg-secondary p-3 text-center">
                            <p className="text-2xl font-bold text-card-foreground">
                                {summaryData?.durationSeconds
                                    ? formatDuration(summaryData.durationSeconds)
                                    : '—'}
                            </p>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Duración
                            </p>
                        </div>
                        <div className="rounded-2xl bg-secondary p-3 text-center">
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {prsThisSession}
                            </p>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                PRs
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">
                                ¿Cómo fue la sesión? (opcional)
                            </label>
                            <textarea
                                value={sessionNote}
                                onChange={(e) => { setSessionNote(e.target.value); setNoteSaved(false) }}
                                placeholder="Ej: Subí el peso en press, me costó la última serie..."
                                rows={2}
                                className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground"
                            />
                            {sessionNote.trim() && (
                                <button
                                    type="button"
                                    onClick={saveNote}
                                    disabled={savingNote}
                                    className="mt-1.5 rounded-xl bg-indigo-600/10 px-3 py-1.5 text-xs font-medium text-indigo-500 transition hover:bg-indigo-600/20 disabled:opacity-50"
                                >
                                    {savingNote ? 'Guardando...' : noteSaved ? '✓ Guardado' : 'Guardar nota'}
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push(returnHref)}
                            className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.97]"
                        >
                            {returnLabel}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => router.push(progressHref)}
                                className="rounded-2xl border border-border bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted active:scale-[0.97]"
                            >
                                Ver progreso
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(routineHref ?? returnHref.replace('/train', ''))}
                                className="rounded-2xl border border-border bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted active:scale-[0.97]"
                            >
                                Ver rutina
                            </button>
                        </div>
                    </div>

                    <p className="mt-3 text-center text-xs text-muted-foreground">
                        Tocá fuera para seguir entrenando
                    </p>
                </div>
            </div>
        )
    }

    if (phase === 'rest') {
        const progress =
            restBaseSeconds > 0
                ? ((restBaseSeconds - restTimeLeft) / restBaseSeconds) * 100
                : 0

        const nextActiveIdx = exerciseSets.findIndex((s) => s.status === 'active')

        return (
            <div
                className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4"
                style={{
                    paddingBottom: `calc(${APP_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 1rem)`,
                }}
            >
                <div className="w-full rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-widest text-indigo-500">
                        Descanso
                    </p>

                    <p className="mt-4 text-6xl font-bold tabular-nums text-card-foreground">
                        {formatTime(restTimeLeft)}
                    </p>

                    <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-linear ${restTimeLeft <= 5 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <p className="mt-4 text-sm font-medium text-card-foreground">
                        {restTimeLeft <= 5 ? '¡Listo!' : 'Descansando'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Siguiente: serie {nextActiveIdx >= 0 ? nextActiveIdx + 1 : '?'} de{' '}
                        {exercise.setsCount} — {exercise.exerciseName}
                    </p>

                    <div className="mt-5 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setRestTimeLeft((prev) => prev + 15)}
                            className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition hover:bg-muted active:scale-[0.97]"
                        >
                            +15s
                        </button>

                        <button
                            type="button"
                            onClick={skipRest}
                            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.97]"
                        >
                            Saltar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (phase === 'transition') {
        const completedCount = exerciseSets.filter(
            (s) => s.status === 'completed'
        ).length
        const nextExercise = exercises[currentExerciseIndex + 1]

        return (
            <div
                className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4"
                style={{
                    paddingBottom: `calc(${APP_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 1rem)`,
                }}
            >
                <div className="w-full rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                        <svg
                            className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-card-foreground">
                        {exercise.exerciseName}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {completedCount} de {exercise.setsCount} series completadas
                    </p>

                    {nextExercise && (
                        <div className="mt-5 rounded-2xl border border-border bg-secondary/50 p-4">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                                Siguiente
                            </p>
                            <p className="mt-1 text-base font-semibold text-card-foreground">
                                {nextExercise.exerciseName}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {nextExercise.setsCount} series
                                {nextExercise.targetReps
                                    ? ` · ${nextExercise.targetReps} ${nextExercise.isCardio ? 'min' : 'reps'}`
                                    : ''}
                            </p>
                        </div>
                    )}

                    <div className="mt-5 flex gap-3">
                        {nextExercise && (
                            <button
                                type="button"
                                onClick={goToNextExercise}
                                className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.97]"
                            >
                                Siguiente ejercicio
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={finishSession}
                            disabled={saving}
                            className={`rounded-2xl border border-border px-4 py-3.5 text-sm font-medium transition active:scale-[0.97] hover:bg-muted ${allExercisesDone || !nextExercise
                                ? 'flex-1 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500'
                                : 'bg-secondary text-secondary-foreground'
                                }`}
                        >
                            {saving
                                ? 'Guardando...'
                                : allExercisesDone || !nextExercise
                                    ? 'Finalizar sesión'
                                    : 'Terminar antes'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const historicalMax = localMaxWeights[exercise.id] ?? null
    const completedSetsCount = exerciseSets.filter((s) => s.status === 'completed').length
    const totalSetsSession = exercises.reduce((acc, ex) => acc + ex.setsCount, 0)

    return (
        <div
            className="mx-auto max-w-lg px-3 pt-2"
            aria-label={`${routineName} · ${dayLabel}`}
            style={{
                paddingBottom: `calc(${APP_BOTTOM_NAV_HEIGHT_PX}px + 7.5rem + env(safe-area-inset-bottom, 0px))`,
            }}
        >
            {/* ── Global progress ── */}
            <div className="mb-3">
                <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                        {completedSetsTotal} / {totalSetsSession} series
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {totalSetsSession > 0 ? Math.round((completedSetsTotal / totalSetsSession) * 100) : 0}%
                    </p>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                        style={{ width: totalSetsSession > 0 ? `${Math.round((completedSetsTotal / totalSetsSession) * 100)}%` : '0%' }}
                    />
                </div>
            </div>

            {/* ── Header ── */}
            <div className="min-w-0">
                <p className="text-xs font-medium text-indigo-500">
                    {dayLabel} · {exercise.block === 'activation' ? 'Activación' : exercise.block === 'closing' ? 'Cierre' : 'Principal'} · {currentExerciseIndex + 1}/{totalExercises}
                </p>
                <h2 className="mt-0.5 truncate text-xl font-bold text-card-foreground">
                    {exercise.exerciseName}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    {activeSet
                        ? `Serie ${activeSetIndex + 1} de ${exercise.setsCount}`
                        : `${completedSetsCount} de ${exercise.setsCount} series completadas`}
                    {exercise.targetReps
                        ? ` · ${exercise.targetReps} ${exercise.isCardio ? 'minutos' : 'repeticiones'}`
                        : ''}
                </p>
                {exercise.video_url && (
                    <ExerciseDemo
                        key={`${exercise.id}-${exercise.video_url}`}
                        exerciseName={exercise.exerciseName}
                        videoUrl={exercise.video_url}
                        instructions={exercise.instructions}
                    />
                )}
                {exercise.lastPerformedAt && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Última vez: {(() => {
                            const d = new Date(exercise.lastPerformedAt!)
                            const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
                            if (diffDays === 0) return 'hoy'
                            if (diffDays === 1) return 'ayer'
                            if (diffDays < 7) return `hace ${diffDays} días`
                            if (diffDays < 14) return 'hace 1 semana'
                            return `hace ${Math.floor(diffDays / 7)} semanas`
                        })()}
                        {exercise.previousWeights[0] != null && (
                            <span className="ml-1 font-medium text-foreground">
                                · {exercise.previousWeights[0]} {weightUnit}
                                {exercise.previousReps[0] != null && ` × ${exercise.previousReps[0]}`}
                            </span>
                        )}
                    </p>
                )}
            </div>

            {/* ── Exercise nav indicators ── */}
            {totalExercises > 1 && <div className="mt-3 flex gap-1.5 overflow-x-auto pb-2 items-center">
                {exercises.map((ex, idx) => {
                    const exSets = sets[idx] ?? []
                    const allDone = exSets.length > 0 && exSets.every(
                        (s) => s.status === 'completed' || s.status === 'skipped'
                    )
                    const isCurrent = idx === currentExerciseIndex

                    const showBlockHeader = idx === 0 || exercises[idx - 1].block !== ex.block
                    const blockLabel = ex.block === 'activation' ? 'Activación' : ex.block === 'closing' ? 'Cierre' : 'Principal'

                    return (
                        <React.Fragment key={ex.id}>
                            {showBlockHeader && (
                                <span className={`text-[9px] font-bold uppercase tracking-widest text-muted-foreground shrink-0 ${idx > 0 ? 'ml-2' : ''}`}>
                                    {blockLabel}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => goToExercise(idx)}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition active:scale-90 ${
                                    isCurrent
                                        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-400 dark:ring-indigo-400'
                                        : allDone
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {allDone ? '✓' : idx + 1}
                            </button>
                        </React.Fragment>
                    )
                })}
            </div>}


            {/* ── Series ── */}
            <div className="mt-3 space-y-2">
                {exerciseSets.map((set, idx) => {
                    const isActive = set.status === 'active'
                    const isCompleted = set.status === 'completed'
                    const isSkipped = set.status === 'skipped'
                    const isEditingCompleted = isCompleted && editingCompletedSetIndex === idx

                    if (isActive) {
                        return (
                            <section key={idx} className="rounded-xl border border-indigo-500/40 bg-indigo-500/[0.06] p-3">
                                <div className={`grid gap-2 ${exercise.isCardio ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {!exercise.isCardio && (
                                        <label className="min-w-0">
                                            <span className="mb-1 block text-xs font-semibold text-foreground">Peso ({weightUnit})</span>
                                            <input
                                                ref={weightInputRef}
                                                aria-label={`Peso de la serie ${idx + 1} en ${weightUnit}`}
                                                type="number"
                                                inputMode="decimal"
                                                step="0.5"
                                                placeholder="—"
                                                value={set.weight}
                                                onChange={(e) => updateSetField(idx, 'weight', e.target.value)}
                                                onKeyDown={(e) => handleWeightKeyDown(e, idx)}
                                                className="h-11 w-full rounded-lg border border-indigo-500/35 bg-background px-3 text-center text-lg font-bold text-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                                            />
                                            <span className="mt-1 block text-[10px] text-muted-foreground">
                                                {exercise.previousWeights[idx] != null ? `Anterior: ${exercise.previousWeights[idx]} ${weightUnit}` : 'Ingresá el peso usado'}
                                            </span>
                                        </label>
                                    )}

                                    <label className="min-w-0">
                                        <span className="mb-1 block text-xs font-semibold text-foreground">
                                            {exercise.isCardio ? 'Tiempo (minutos)' : 'Repeticiones'}
                                        </span>
                                        <input
                                            ref={repsInputRef}
                                            aria-label={`${exercise.isCardio ? 'Minutos' : 'Repeticiones'} de la serie ${idx + 1}`}
                                            type="number"
                                            inputMode="numeric"
                                            placeholder="—"
                                            value={set.reps}
                                            onChange={(e) => updateSetField(idx, 'reps', e.target.value)}
                                            onKeyDown={(e) => handleRepsKeyDown(e, idx)}
                                            className="h-11 w-full rounded-lg border border-indigo-500/35 bg-background px-3 text-center text-lg font-bold text-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
                                        />
                                        <span className="mt-1 block text-[10px] text-muted-foreground">
                                            {exercise.previousReps[idx] != null
                                                ? `Anterior: ${exercise.previousReps[idx]} ${exercise.isCardio ? 'min' : 'reps'}`
                                                : exercise.targetReps
                                                    ? `Objetivo: ${exercise.targetReps} ${exercise.isCardio ? 'minutos' : 'repeticiones'}`
                                                    : exercise.isCardio ? 'Ingresá el tiempo realizado' : 'Ingresá las repeticiones'}
                                        </span>
                                    </label>
                                </div>

                                <div className="mt-2.5 border-t border-indigo-500/20 pt-2">
                                    <button
                                        type="button"
                                        aria-expanded={showRpeInfo}
                                        onClick={() => setShowRpeInfo(!showRpeInfo)}
                                        className="flex min-h-8 w-full items-center justify-between rounded-lg px-1 text-left text-xs font-medium text-muted-foreground transition hover:text-foreground"
                                    >
                                        <span>{set.rpe ? `Esfuerzo: ${set.rpe}/10` : 'Agregar esfuerzo percibido (opcional)'}</span>
                                        <span aria-hidden="true">{showRpeInfo ? '−' : '+'}</span>
                                    </button>
                                    {showRpeInfo && (
                                        <div className="mt-1.5">
                                            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                                                1–6 fácil · 7–8 difícil y controlado · 9–10 al límite
                                            </p>
                                            <div className="flex justify-between gap-1">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        aria-label={`Esfuerzo ${n} de 10`}
                                                        onClick={() => updateSetRpe(idx, set.rpe === String(n) ? '' : String(n))}
                                                        className={`h-7 min-w-0 flex-1 rounded-md text-[11px] font-medium transition active:scale-90 ${
                                                            set.rpe === String(n)
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
                                                        }`}
                                                    >
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )
                    }

                    if (isEditingCompleted) {
                        return (
                            <div key={idx} className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-xs font-semibold text-foreground">Corregir serie {idx + 1}</p>
                                    <button type="button" onClick={() => setEditingCompletedSetIndex(null)} className="text-xs text-muted-foreground">Cancelar</button>
                                </div>
                                <div className={`grid gap-2 ${exercise.isCardio ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {!exercise.isCardio && (
                                        <label>
                                            <span className="mb-1 block text-[11px] text-muted-foreground">Peso ({weightUnit})</span>
                                            <input type="number" inputMode="decimal" step="0.5" value={set.weight} onChange={(e) => updateSetField(idx, 'weight', e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-2 text-center text-sm font-semibold text-foreground outline-none focus:border-indigo-500" />
                                        </label>
                                    )}
                                    <label>
                                        <span className="mb-1 block text-[11px] text-muted-foreground">{exercise.isCardio ? 'Tiempo (min)' : 'Repeticiones'}</span>
                                        <input type="number" inputMode="numeric" value={set.reps} onChange={(e) => updateSetField(idx, 'reps', e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-2 text-center text-sm font-semibold text-foreground outline-none focus:border-indigo-500" />
                                    </label>
                                </div>
                                <button type="button" onClick={() => confirmSet(idx)} disabled={saving} className="mt-2 h-10 w-full rounded-lg bg-emerald-600 text-xs font-semibold text-white disabled:opacity-50">
                                    {saving ? 'Guardando…' : 'Guardar corrección'}
                                </button>
                            </div>
                        )
                    }

                    return (
                        <div key={idx} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 ${
                            isCompleted
                                ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                                : isSkipped
                                    ? 'border-border bg-card/40 opacity-50'
                                    : 'border-border bg-card/60'
                        }`}>
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                isCompleted ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                                {isCompleted ? '✓' : isSkipped ? '—' : idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground">Serie {idx + 1}</p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                    {isCompleted
                                        ? `${exercise.isCardio ? '' : `${set.weight || '0'} ${weightUnit} · `}${set.reps || '0'} ${exercise.isCardio ? 'min' : 'reps'}${set.rpe ? ` · Esfuerzo ${set.rpe}/10` : ''}`
                                        : isSkipped ? 'Salteada' : 'Pendiente'}
                                </p>
                            </div>
                            {showPrs && isCompleted && set.isPR && <span aria-label="Récord personal">🏆</span>}
                            {isCompleted && (
                                <button type="button" onClick={() => setEditingCompletedSetIndex(idx)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/10">
                                    Editar
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {historicalMax !== null && historicalMax > 0 && (
                <div className="mt-3 rounded-xl border border-border bg-secondary/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                        Mejor histórico:{' '}
                        <span className="font-semibold text-foreground">
                            {historicalMax} {weightUnit}
                        </span>
                    </p>
                </div>
            )}

            {/* ── Bottom action bar ── */}
            <div
                className="fixed left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur"
                style={{
                    bottom: `calc(${APP_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`,
                }}
            >
                {saveError && (
                    <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-center">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">{saveError}</p>
                    </div>
                )}
                {(setFlash || (showPrs && prFlash)) && !saveError && (
                    <div className="border-b border-border px-4 py-1.5 text-center">
                        {showPrs && prFlash ? (
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">🏆 ¡Nuevo PR!</p>
                        ) : (
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ {setFlash}</p>
                        )}
                    </div>
                )}
                <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
                    {activeSet ? (
                        <>
                            <button
                                type="button"
                                onClick={skipSet}
                                className="min-h-[48px] rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm font-medium text-secondary-foreground transition hover:bg-muted active:scale-[0.97]"
                            >
                                Saltar serie
                            </button>

                            <button
                                type="button"
                                onClick={() => confirmSet()}
                                disabled={saving}
                                className="flex-1 min-h-[48px] rounded-xl bg-indigo-600 px-4 py-3.5 text-center text-sm font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50 active:scale-[0.97]"
                            >
                                {saving ? 'Guardando...' : `Guardar serie ${activeSetIndex + 1}`}
                            </button>
                        </>
                    ) : (
                        <>
                            {currentExerciseIndex < totalExercises - 1 ? (
                                <button
                                    type="button"
                                    onClick={goToNextExercise}
                                    className="flex-1 min-h-[48px] rounded-xl bg-indigo-600 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.97]"
                                >
                                    Siguiente ejercicio
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={finishSession}
                                    disabled={saving}
                                    className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 active:scale-[0.97]"
                                >
                                    {saving ? 'Guardando...' : 'Finalizar sesión'}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => router.push(returnHref)}
                                disabled={saving}
                                className="min-h-[48px] rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm font-medium text-secondary-foreground transition hover:bg-muted disabled:opacity-50 active:scale-[0.97]"
                            >
                                Salir
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
