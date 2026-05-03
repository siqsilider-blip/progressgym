'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { saveSet, completeSession } from './train-focused-actions'

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
    routineName: _routineName,
    performedAt,
    exercises,
    maxWeights: initialMaxWeights,
    weightUnit,
    returnHref,
    showPrs = true,
    initialPhase,
}: Props) {
    const router = useRouter()

    // ── Core state ──
    const [currentExerciseIndex, setCurrentExerciseIndex] = React.useState(0)
    const [showRpeInfo, setShowRpeInfo] = React.useState(false)
    const [sets, setSets] = React.useState<SetState[][]>(() => initAllSets(exercises))
    const [phase, setPhase] = React.useState<Phase>(initialPhase ?? 'training')
    const [saving, setSaving] = React.useState(false)
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

    // ── PR flash ──
    const [prFlash, setPrFlash] = React.useState(false)

    // ── Set confirmed flash ──
    const [setFlash, setSetFlash] = React.useState<string | null>(null)

    // ── Refs para inputs ──
    const weightInputRef = React.useRef<HTMLInputElement>(null)
    const repsInputRef = React.useRef<HTMLInputElement>(null)

    const exercise = exercises[currentExerciseIndex]
    console.log('exercise isCardio:', exercise?.exerciseName, exercise?.isCardio)
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
        if (phase === 'training' && activeSetIndex >= 0) {
            const timer = setTimeout(() => {
                weightInputRef.current?.focus()
            }, 50)
            return () => clearTimeout(timer)
        }
    }, [phase, activeSetIndex, currentExerciseIndex])

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

        if (weightVal === null && repsVal === null) return

        setSaving(true)

        const result = await saveSet({
            sessionId,
            studentId,
            routineDayExerciseId: exercise.id,
            setIndex: targetSet.setIndex,
            weight: weightVal,
            reps: repsVal,
            rpe: rpeVal,
            performedAt,
        })

        setSaving(false)

        if (!result.ok) {
            console.error('Error saving set:', result.error)
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

            console.log('[confirmSet] setIdx:', setIdx, '| totalSets:', exerciseSets.length, '| restSeconds:', capturedRestSeconds, '| hasMoreSets:', hasMoreSets)

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

            console.log('[confirmSet] decision:', decision?.next, '| capturedRestSeconds:', capturedRestSeconds)
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

        console.log('[confirmSet] executing decision:', decision.next)

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

                    <div className="mt-5 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => router.push(returnHref)}
                            className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.97]"
                        >
                            Ir al perfil
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => router.push(`/dashboard/students/${studentId}/progress`)}
                                className="rounded-2xl border border-border bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted active:scale-[0.97]"
                            >
                                Ver progreso
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(returnHref.replace('/train', ''))}
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
                        Siguiente: Set {nextActiveIdx >= 0 ? nextActiveIdx + 1 : '?'} de{' '}
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
            style={{
                paddingBottom: `calc(${APP_BOTTOM_NAV_HEIGHT_PX}px + 7.5rem + env(safe-area-inset-bottom, 0px))`,
            }}
        >
            {/* ── Global progress ── */}
            <div className="mb-3">
                <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                        {completedSetsTotal} / {totalSetsSession} sets
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
                    {dayLabel} · {currentExerciseIndex + 1}/{totalExercises}
                </p>
                <h2 className="mt-0.5 truncate text-xl font-bold text-card-foreground">
                    {exercise.exerciseName}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    {activeSet
                        ? `Set ${activeSetIndex + 1} de ${exercise.setsCount}`
                        : `${completedSetsCount} de ${exercise.setsCount} sets completados`}
                    {exercise.targetReps
                        ? ` · ${exercise.targetReps} ${exercise.isCardio ? 'min' : 'reps'}`
                        : ''}
                </p>
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
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                {exercises.map((ex, idx) => {
                    const exSets = sets[idx] ?? []
                    const allDone = exSets.length > 0 && exSets.every(
                        (s) => s.status === 'completed' || s.status === 'skipped'
                    )
                    const isCurrent = idx === currentExerciseIndex

                    return (
                        <button
                            key={ex.id}
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
                    )
                })}
            </div>


            {/* ── Sets list ── */}
            <div className="mt-4 space-y-2">
                {exerciseSets.map((set, idx) => {
                    const isActive = set.status === 'active'
                    const isCompleted = set.status === 'completed'
                    const isSkipped = set.status === 'skipped'
                    const isPending = set.status === 'pending'

                    const isEditable = isActive || isCompleted || isPending

                    return (
                        <div
                            key={idx}
                            className={`rounded-2xl border transition-all duration-300 ${isActive
                                ? 'border-indigo-300 border-t-2 border-t-indigo-600 bg-indigo-50/60 p-5 ring-2 ring-indigo-500/50 shadow-md dark:border-indigo-500/40 dark:border-t-indigo-500 dark:bg-indigo-500/8 dark:ring-indigo-500/40'
                                : isCompleted
                                    ? 'border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/5'
                                    : isSkipped
                                        ? 'border-zinc-200 bg-zinc-50/50 px-3 py-2 opacity-40 dark:border-zinc-700 dark:bg-zinc-800/50'
                                        : 'border-dashed border-border bg-card/50 px-3 py-2 opacity-60'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex shrink-0 items-center justify-center rounded-lg font-bold ${isActive
                                        ? 'h-9 w-9 bg-indigo-600 text-sm text-white'
                                        : 'h-7 w-7 text-xs ' + (isCompleted
                                            ? 'bg-emerald-500 text-white'
                                            : isSkipped
                                                ? 'bg-zinc-300 text-zinc-500 dark:bg-zinc-600 dark:text-zinc-400'
                                                : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500')
                                        }`}
                                >
                                    {isCompleted ? '✓' : isSkipped ? '—' : idx + 1}
                                </div>

                                {isEditable && (
                                    <div className="flex flex-1 items-center gap-2">
                                        {!exercise.isCardio && (
                                        <div className="flex-1">
                                            <label className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                                                {weightUnit}
                                            </label>
                                            <input
                                                ref={isActive ? weightInputRef : undefined}
                                                type="number"
                                                inputMode="decimal"
                                                step="0.5"
                                                placeholder={
                                                    exercise.previousWeights[idx] != null
                                                        ? String(exercise.previousWeights[idx])
                                                        : '0'
                                                }
                                                value={set.weight}
                                                onChange={(e) =>
                                                    updateSetField(idx, 'weight', e.target.value)
                                                }
                                                onKeyDown={(e) => handleWeightKeyDown(e, idx)}
                                                className={`mt-0.5 w-full rounded-xl border bg-background px-3 text-center font-bold text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${isActive
                                                    ? 'border-indigo-300 py-2.5 text-xl dark:border-indigo-500/40'
                                                    : isCompleted
                                                        ? 'border-emerald-200 py-1.5 text-sm dark:border-emerald-500/30'
                                                        : 'border-border py-1.5 text-sm'
                                                    }`}
                                            />
                                        </div>
                                        )}

                                        <div className="flex-1">
                                            <label className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                                                {exercise.isCardio ? 'Min' : 'Reps'}
                                            </label>
                                            <input
                                                ref={isActive ? repsInputRef : undefined}
                                                type="number"
                                                inputMode="numeric"
                                                placeholder={
                                                    exercise.previousReps[idx] != null
                                                        ? String(exercise.previousReps[idx])
                                                        : exercise.targetReps ?? '0'
                                                }
                                                value={set.reps}
                                                onChange={(e) =>
                                                    updateSetField(idx, 'reps', e.target.value)
                                                }
                                                onKeyDown={(e) => handleRepsKeyDown(e, idx)}
                                                className={`mt-0.5 w-full rounded-xl border bg-background px-3 text-center font-bold text-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${isActive
                                                    ? 'border-indigo-300 py-2.5 text-xl dark:border-indigo-500/40'
                                                    : isCompleted
                                                        ? 'border-emerald-200 py-1.5 text-sm dark:border-emerald-500/30'
                                                        : 'border-border py-1.5 text-sm'
                                                    }`}
                                            />
                                        </div>

                                        {showPrs && isCompleted && set.isPR && (
                                            <span className="shrink-0 text-sm">🏆</span>
                                        )}

                                        {isCompleted && set.rpe !== '' && (
                                            <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                                                RPE {set.rpe}
                                            </span>
                                        )}

                                        {isPending && (
                                            <button
                                                type="button"
                                                onClick={() => confirmSet(idx)}
                                                disabled={saving}
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition hover:bg-indigo-200 active:scale-90 dark:bg-indigo-500/15 dark:text-indigo-400 dark:hover:bg-indigo-500/25"
                                            >
                                                <svg
                                                    className="h-4 w-4"
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
                                            </button>
                                        )}
                                    </div>
                                )}

                                {isSkipped && (
                                    <p className="flex-1 text-center text-xs text-zinc-400">
                                        Salteada
                                    </p>
                                )}
                            </div>

                            {isActive && (
                                <div className="mt-3 border-t border-indigo-200 pt-3 dark:border-indigo-500/30">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                                            RPE
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowRpeInfo(!showRpeInfo)}
                                            className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border text-[8px] text-muted-foreground transition hover:text-foreground"
                                        >
                                            ?
                                        </button>
                                    </div>
                                    {showRpeInfo && (
                                        <div className="mb-2 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-[10px] text-muted-foreground leading-relaxed">
                                            <p className="font-medium text-foreground mb-0.5">
                                                RPE — Esfuerzo percibido (1-10)
                                            </p>
                                            <p>1-4: Muy fácil · 5-6: Moderado</p>
                                            <p>7-8: Difícil, podés más · 9: Casi al límite</p>
                                            <p>10: Máximo esfuerzo, no podés más</p>
                                        </div>
                                    )}
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => updateSetRpe(idx, set.rpe === String(n) ? '' : String(n))}
                                                className={`h-7 w-7 rounded-lg text-[11px] font-medium transition active:scale-90 ${
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
                {(setFlash || (showPrs && prFlash)) && (
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
                                Saltar
                            </button>

                            <button
                                type="button"
                                onClick={() => confirmSet()}
                                disabled={saving}
                                className="flex-1 min-h-[48px] rounded-xl bg-indigo-600 px-4 py-3.5 text-center text-sm font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50 active:scale-[0.97]"
                            >
                                {saving ? 'Guardando...' : `Guardar set ${activeSetIndex + 1}`}
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
