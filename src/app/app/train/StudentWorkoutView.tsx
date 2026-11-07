'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, ChevronDown, ChevronUp, Clock3, MessageCircle, RefreshCw, Trophy, WifiOff } from 'lucide-react'
import { completeSession, saveSet } from '@/app/dashboard/students/[studentId]/train/train-focused-actions'
import ExerciseDemo from '@/app/dashboard/students/[studentId]/train/ExerciseDemo'
import MessageComposer from '@/components/coaching/MessageComposer'
import WorkoutFeedbackForm from '@/components/coaching/WorkoutFeedbackForm'

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
    muscleGroup?: string | null
    category?: string | null
    block: RoutineBlock
}

type SetState = {
    weight: string
    reps: string
    rpe: string
    saved: boolean
    dirty: boolean
    queued: boolean
    isPr: boolean
    error: string | null
}

type WorkoutDraftEntry = {
    exerciseId: string
    setIndex: number
    weight: string
    reps: string
    rpe: string
    queued: boolean
}

type WorkoutDraft = {
    version: 1
    updatedAt: string
    entries: WorkoutDraftEntry[]
}

type DraftStorageStatus = 'checking' | 'available' | 'unavailable'

type Props = {
    sessionId: string
    studentId: string
    studentName: string
    dayLabel: string
    performedAt: string
    exercises: ExerciseData[]
    maxWeights: Record<string, number>
    prDetectionAvailable: boolean
    weightUnit: string
    returnHref: string
    returnLabel?: string
    routineHref?: string
    progressHref: string
    showPrs?: boolean
    initialSummary?: boolean
    initialIncomplete?: boolean
}

const BLOCKS: { id: RoutineBlock; label: string; emoji: string }[] = [
    { id: 'activation', label: 'Activación', emoji: '⚡' },
    { id: 'main', label: 'Bloque principal', emoji: '💪' },
    { id: 'closing', label: 'Cierre', emoji: '🧘' },
]

const APP_BOTTOM_NAV_HEIGHT_PX = 72
const WORKOUT_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

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
                queued: false,
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

function validateSet(exercise: ExerciseData, set: SetState) {
    const repsText = set.reps.trim()
    const weightText = set.weight.trim()
    const rpeText = set.rpe.trim()
    const reps = repsText === '' ? null : Number(repsText)
    const weight = weightText === '' ? null : Number(weightText)
    const rpe = rpeText === '' ? null : Number(rpeText)

    if (reps === null || !Number.isInteger(reps) || reps <= 0) {
        return exercise.isCardio
            ? 'Ingresá los minutos realizados.'
            : 'Ingresá las repeticiones realizadas.'
    }
    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
        return 'El peso no puede ser negativo.'
    }
    if (rpe !== null && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10)) {
        return 'El esfuerzo debe estar entre 1 y 10.'
    }
    return null
}

export default function StudentWorkoutView({
    sessionId,
    studentId,
    dayLabel,
    performedAt,
    exercises,
    maxWeights,
    prDetectionAvailable,
    weightUnit,
    returnHref,
    returnLabel = 'Volver a la rutina',
    routineHref = returnHref,
    progressHref,
    showPrs = true,
    initialSummary = false,
    initialIncomplete = false,
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
    const [incompleteSession, setIncompleteSession] = React.useState(initialIncomplete)
    const [finishConfirmation, setFinishConfirmation] = React.useState<{ completedSets: number; plannedSets: number } | null>(null)
    const [summary, setSummary] = React.useState<{
        durationSeconds: number | null
        totalSets: number
        plannedSets: number
        completionStatus: 'complete' | 'incomplete'
    } | null>(null)
    const [localMaxWeights, setLocalMaxWeights] = React.useState({ ...maxWeights })
    const [isOnline, setIsOnline] = React.useState(true)
    const [draftReady, setDraftReady] = React.useState(false)
    const [draftRecovered, setDraftRecovered] = React.useState(false)
    const [draftStorageStatus, setDraftStorageStatus] = React.useState<DraftStorageStatus>('checking')
    const [draftPersisted, setDraftPersisted] = React.useState(false)
    const [syncingDrafts, setSyncingDrafts] = React.useState(false)
    const setsRef = React.useRef(sets)
    const syncingDraftsRef = React.useRef(false)
    const syncQueuedSetsRef = React.useRef<() => void>(() => undefined)
    const autoSaveSetRef = React.useRef<(exerciseIndex: number, setIndex: number) => void>(() => undefined)
    const autoSaveTimerRef = React.useRef<number | null>(null)
    const recoveredDraftKeysRef = React.useRef(new Set<string>())
    const continueTrainingButtonRef = React.useRef<HTMLButtonElement | null>(null)
    const draftStorageKey = `progrezzia:workout-draft:${studentId}:${sessionId}`

    const updateSets = React.useCallback((updater: (previous: SetState[][]) => SetState[][]) => {
        setDraftPersisted(false)
        setSets((previous) => {
            const next = updater(previous)
            setsRef.current = next
            return next
        })
    }, [])

    const totalPlannedSets = exercises.reduce((total, exercise) => total + exercise.setsCount, 0)
    const savedSets = sets.reduce((total, exerciseSets) => total + exerciseSets.filter((set) => set.saved).length, 0)
    const progress = totalPlannedSets > 0 ? Math.round((savedSets / totalPlannedSets) * 100) : 0
    const hasDraftChanges = sets.some((exerciseSets) => exerciseSets.some((set) => set.dirty))
    const hasQueuedChanges = sets.some((exerciseSets) => exerciseSets.some((set) => set.queued))
    const hasSafeLocalDraft = draftStorageStatus === 'available' && draftPersisted

    React.useEffect(() => {
        if (restTimeLeft <= 0) return
        const timer = window.setInterval(() => {
            setRestTimeLeft((value) => Math.max(0, value - 1))
        }, 1000)
        return () => window.clearInterval(timer)
    }, [restTimeLeft])

    React.useEffect(() => {
        setsRef.current = sets
    }, [sets])

    React.useEffect(() => {
        setIsOnline(window.navigator.onLine)

        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    React.useEffect(() => {
        try {
            const stored = window.localStorage.getItem(draftStorageKey)
            setDraftStorageStatus('available')
            if (!stored) {
                setDraftPersisted(true)
                return
            }

            const draft = JSON.parse(stored) as WorkoutDraft
            const updatedAt = new Date(draft.updatedAt).getTime()
            if (
                draft.version !== 1
                || !Array.isArray(draft.entries)
                || !Number.isFinite(updatedAt)
                || Date.now() - updatedAt > WORKOUT_DRAFT_MAX_AGE_MS
            ) {
                window.localStorage.removeItem(draftStorageKey)
                setDraftPersisted(true)
                return
            }

            const entryMap = new Map(
                draft.entries.map((entry) => [`${entry.exerciseId}:${entry.setIndex}`, entry])
            )
            recoveredDraftKeysRef.current = new Set(entryMap.keys())

            updateSets((previous) => previous.map((exerciseSets, exerciseIndex) =>
                exerciseSets.map((set, setIndex) => {
                    const exercise = exercises[exerciseIndex]
                    const entry = exercise ? entryMap.get(`${exercise.id}:${setIndex}`) : null
                    if (!entry) return set

                    return {
                        ...set,
                        weight: entry.weight,
                        reps: entry.reps,
                        rpe: entry.rpe,
                        dirty: true,
                        queued: Boolean(entry.queued),
                        error: null,
                    }
                })
            ))
            setDraftRecovered(draft.entries.length > 0)
        } catch {
            try {
                window.localStorage.removeItem(draftStorageKey)
                setDraftStorageStatus('available')
                setDraftPersisted(true)
            } catch {
                setDraftStorageStatus('unavailable')
                setDraftPersisted(false)
            }
        } finally {
            setDraftReady(true)
        }
    }, [draftStorageKey, exercises, updateSets])

    React.useEffect(() => {
        if (!draftReady) return

        const entries: WorkoutDraftEntry[] = []
        sets.forEach((exerciseSets, exerciseIndex) => {
            const exercise = exercises[exerciseIndex]
            if (!exercise) return

            exerciseSets.forEach((set, setIndex) => {
                if (!set.dirty) return
                entries.push({
                    exerciseId: exercise.id,
                    setIndex,
                    weight: set.weight,
                    reps: set.reps,
                    rpe: set.rpe,
                    queued: set.queued,
                })
            })
        })

        try {
            if (entries.length === 0) {
                window.localStorage.removeItem(draftStorageKey)
                setDraftStorageStatus('available')
                setDraftPersisted(true)
                return
            }

            const draft: WorkoutDraft = {
                version: 1,
                updatedAt: new Date().toISOString(),
                entries,
            }
            window.localStorage.setItem(draftStorageKey, JSON.stringify(draft))
            setDraftStorageStatus('available')
            setDraftPersisted(true)
        } catch {
            setDraftStorageStatus('unavailable')
            setDraftPersisted(false)
        }
    }, [draftReady, draftStorageKey, exercises, sets])

    function updateField(exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', value: string) {
        updateSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
            currentExerciseIndex !== exerciseIndex
                ? exerciseSets
                : exerciseSets.map((set, currentSetIndex) =>
                    currentSetIndex !== setIndex
                        ? set
                        : { ...set, [field]: value, dirty: true, error: null }
                )
        ))
        setGlobalError(null)
    }

    async function saveOneSet(exerciseIndex: number, setIndex: number, automatic = false) {
        const exercise = exercises[exerciseIndex]
        const set = setsRef.current[exerciseIndex]?.[setIndex]
        if (!exercise || !set || savingKey || syncingDraftsRef.current) return

        if (!automatic && autoSaveTimerRef.current !== null) {
            window.clearTimeout(autoSaveTimerRef.current)
            autoSaveTimerRef.current = null
        }

        const validationError = validateSet(exercise, set)
        if (validationError) {
            updateSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                currentExerciseIndex !== exerciseIndex
                    ? exerciseSets
                    : exerciseSets.map((item, currentSetIndex) =>
                        currentSetIndex === setIndex
                            ? { ...item, error: validationError }
                            : item
                    )
            ))
            return
        }

        if (!window.navigator.onLine) {
            setIsOnline(false)
            updateSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                currentExerciseIndex !== exerciseIndex
                    ? exerciseSets
                    : exerciseSets.map((item, currentSetIndex) =>
                        currentSetIndex === setIndex
                            ? { ...item, dirty: true, queued: true, error: null }
                            : item
                    )
            ))
            setGlobalError(null)
            return
        }

        // El autoguardado debe ser transparente: iniciar el descanso mientras la
        // persona todavía está escribiendo resulta sorpresivo. El descanso se
        // inicia únicamente cuando confirma la serie con el botón.
        await persistSet(exerciseIndex, setIndex, set, automatic, !automatic)
    }

    async function persistSet(
        exerciseIndex: number,
        setIndex: number,
        set: SetState,
        automatic: boolean,
        startRest: boolean
    ) {
        const exercise = exercises[exerciseIndex]
        if (!exercise) return false

        const validationError = validateSet(exercise, set)
        if (validationError) {
            updateSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                currentExerciseIndex !== exerciseIndex
                    ? exerciseSets
                    : exerciseSets.map((item, currentSetIndex) =>
                        currentSetIndex === setIndex
                            ? { ...item, error: validationError }
                            : item
                    )
            ))
            return false
        }

        const weight = set.weight.trim() === '' ? null : Number(set.weight)
        const reps = set.reps.trim() === '' ? null : Number(set.reps)
        const rpe = set.rpe.trim() === '' ? null : Number(set.rpe)

        const key = `${exerciseIndex}-${setIndex}`
        const draftKey = `${exercise.id}:${setIndex}`
        const cameFromRecoveredDraft = recoveredDraftKeysRef.current.has(draftKey)
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
                updateSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                    currentExerciseIndex !== exerciseIndex
                        ? exerciseSets
                        : exerciseSets.map((item, currentSetIndex) =>
                            currentSetIndex === setIndex
                                ? { ...item, dirty: true, queued: false, error: result.error || 'No se pudo guardar.' }
                                : item
                        )
                ))
                if (automatic) {
                    setGlobalError(result.error || 'No pudimos guardar esta serie. Revisala y volvé a intentar.')
                }
                return false
            }

            const oldMax = localMaxWeights[exercise.id] ?? 0
            const isPr = showPrs && prDetectionAvailable && weight != null && weight > oldMax
            if (isPr && weight != null) {
                setLocalMaxWeights((previous) => ({ ...previous, [exercise.id]: weight }))
            }

            const latestSet = setsRef.current[exerciseIndex]?.[setIndex]
            const valuesUnchanged = Boolean(
                latestSet
                && latestSet.weight === set.weight
                && latestSet.reps === set.reps
                && latestSet.rpe === set.rpe
            )

            updateSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                currentExerciseIndex !== exerciseIndex
                    ? exerciseSets
                    : exerciseSets.map((item, currentSetIndex) =>
                        currentSetIndex === setIndex
                            ? valuesUnchanged
                                ? { ...item, saved: true, dirty: false, queued: false, isPr, error: null }
                                : { ...item, saved: true, dirty: true, queued: false, error: null }
                            : item
                    )
            ))
            if (valuesUnchanged) recoveredDraftKeysRef.current.delete(draftKey)

            if (valuesUnchanged && startRest && !cameFromRecoveredDraft && !completedSession && !incompleteSession && !set.saved && exercise.restSeconds > 0) {
                setRestExerciseName(exercise.exerciseName)
                setRestTimeLeft(exercise.restSeconds)
            }
            return valuesUnchanged
        } catch {
            const offline = !window.navigator.onLine
            if (offline) setIsOnline(false)
            updateSets((previous) => previous.map((exerciseSets, currentExerciseIndex) =>
                currentExerciseIndex !== exerciseIndex
                    ? exerciseSets
                    : exerciseSets.map((item, currentSetIndex) =>
                        currentSetIndex === setIndex
                            ? {
                                ...item,
                                dirty: true,
                                queued: offline,
                                error: offline ? null : 'No pudimos conectar. Tocá guardar para reintentar.',
                            }
                            : item
                    )
            ))
            setGlobalError(offline
                ? 'No pudimos conectar. Conservá esta pantalla abierta mientras reintentamos.'
                : 'No pudimos conectar con el servidor. Conservá esta pantalla abierta y volvé a intentar.')
            return false
        } finally {
            setSavingKey(null)
        }
    }

    React.useEffect(() => {
        autoSaveSetRef.current = (exerciseIndex, setIndex) => {
            void saveOneSet(exerciseIndex, setIndex, true)
        }
    })

    React.useEffect(() => {
        if (!draftReady || savingKey || syncingDrafts || finishing) return

        const candidate = sets.flatMap((exerciseSets, exerciseIndex) =>
            exerciseSets.map((set, setIndex) => ({ exerciseIndex, setIndex, set }))
        ).find(({ exerciseIndex, set }) => {
            const exercise = exercises[exerciseIndex]
            return Boolean(exercise && set.dirty && !set.queued && !set.error && validateSet(exercise, set) === null)
        })

        if (!candidate) return

        autoSaveTimerRef.current = window.setTimeout(() => {
            autoSaveTimerRef.current = null
            autoSaveSetRef.current(candidate.exerciseIndex, candidate.setIndex)
        }, 900)

        return () => {
            if (autoSaveTimerRef.current !== null) {
                window.clearTimeout(autoSaveTimerRef.current)
                autoSaveTimerRef.current = null
            }
        }
    }, [draftReady, exercises, finishing, savingKey, sets, syncingDrafts])

    async function syncQueuedSets() {
        if (syncingDraftsRef.current || !window.navigator.onLine) return

        const pending = setsRef.current.flatMap((exerciseSets, exerciseIndex) =>
            exerciseSets
                .map((set, setIndex) => ({ exerciseIndex, setIndex, set }))
                .filter(({ set }) => set.dirty && set.queued)
        )
        if (pending.length === 0) return

        syncingDraftsRef.current = true
        setSyncingDrafts(true)
        setGlobalError(null)

        try {
            for (const item of pending) {
                if (!window.navigator.onLine) break
                await persistSet(item.exerciseIndex, item.setIndex, item.set, true, false)
            }
        } finally {
            syncingDraftsRef.current = false
            setSyncingDrafts(false)
        }
    }

    React.useEffect(() => {
        syncQueuedSetsRef.current = () => {
            void syncQueuedSets()
        }
    })

    React.useEffect(() => {
        if (!draftReady || !isOnline) return
        const timeout = window.setTimeout(() => syncQueuedSetsRef.current(), 500)
        return () => window.clearTimeout(timeout)
    }, [draftReady, isOnline])

    React.useEffect(() => {
        if (!finishConfirmation) return

        const previousFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null
        continueTrainingButtonRef.current?.focus()

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFinishConfirmation(null)
        }
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            previousFocus?.focus()
        }
    }, [finishConfirmation])

    async function persistDirtySetsBeforeFinish() {
        const pending = setsRef.current.flatMap((exerciseSets, exerciseIndex) =>
            exerciseSets
                .map((set, setIndex) => ({ exerciseIndex, setIndex, set }))
                .filter(({ set }) => set.dirty)
        )

        const invalid = pending.find(({ exerciseIndex, set }) => {
            const exercise = exercises[exerciseIndex]
            return !exercise || validateSet(exercise, set) !== null
        })

        if (invalid) {
            const exercise = exercises[invalid.exerciseIndex]
            const validationError = exercise ? validateSet(exercise, invalid.set) : 'Revisá esta serie.'
            updateSets((previous) => previous.map((exerciseSets, exerciseIndex) =>
                exerciseIndex !== invalid.exerciseIndex
                    ? exerciseSets
                    : exerciseSets.map((set, setIndex) =>
                        setIndex === invalid.setIndex
                            ? { ...set, error: validationError }
                            : set
                    )
            ))
            if (exercise) setOpenExerciseId(exercise.id)
            setGlobalError('Revisá la serie marcada antes de finalizar.')
            return false
        }

        for (const item of pending) {
            const saved = await persistSet(item.exerciseIndex, item.setIndex, item.set, true, false)
            if (!saved) {
                setGlobalError('No pudimos guardar todos los cambios. Revisá la serie marcada y volvé a finalizar.')
                return false
            }
        }

        if (setsRef.current.some((exerciseSets) => exerciseSets.some((set) => set.dirty))) {
            setGlobalError('Detectamos un cambio pendiente. Esperá a que figure “Guardada ✓” y volvé a finalizar.')
            return false
        }

        return true
    }

    async function finishWorkout(allowIncomplete = false) {
        if (finishing) return
        if (!window.navigator.onLine) {
            setIsOnline(false)
            const hasPendingChanges = hasDraftChanges || hasQueuedChanges
            setGlobalError(hasPendingChanges
                ? hasSafeLocalDraft
                    ? 'Necesitás conexión para finalizar. Tus cambios pendientes están guardados en este teléfono.'
                    : 'Necesitás conexión para finalizar. No cierres la app: este dispositivo no pudo guardar el borrador.'
                : 'Necesitás conexión para finalizar el entrenamiento.')
            return
        }
        if (savingKey || syncingDraftsRef.current) {
            setGlobalError('Estamos guardando tus últimos cambios. Esperá un momento y volvé a intentar.')
            return
        }

        if (autoSaveTimerRef.current !== null) {
            window.clearTimeout(autoSaveTimerRef.current)
            autoSaveTimerRef.current = null
        }

        setFinishing(true)
        setGlobalError(null)

        const pendingSaved = await persistDirtySetsBeforeFinish()
        if (!pendingSaved) {
            setFinishing(false)
            return
        }

        const result = await completeSession({ sessionId, studentId, allowIncomplete })
        setFinishing(false)

        if (result.requiresConfirmation) {
            setFinishConfirmation({
                completedSets: result.completedSets,
                plannedSets: result.plannedSets,
            })
            return
        }

        if (!result.ok) {
            setGlobalError(result.error || 'No pudimos finalizar el entrenamiento.')
            return
        }

        const completionStatus = result.completionStatus ?? 'complete'
        setCompletedSession(completionStatus === 'complete')
        setIncompleteSession(completionStatus === 'incomplete')
        setFinishConfirmation(null)
        setSummary({
            durationSeconds: result.durationSeconds,
            totalSets: result.totalSets,
            plannedSets: result.plannedSets,
            completionStatus,
        })
        setRestTimeLeft(0)
        try {
            window.localStorage.removeItem(draftStorageKey)
        } catch {
            // No afecta a la sesión ya finalizada.
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (summary) {
        const isIncomplete = summary.completionStatus === 'incomplete'
        return (
            <main className="mx-auto max-w-lg px-4 py-6">
                <section className={`rounded-2xl border p-5 text-center ${isIncomplete ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-emerald-500/25 bg-emerald-500/[0.06]'}`}>
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white ${isIncomplete ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                        {isIncomplete
                            ? <AlertTriangle className="h-7 w-7" aria-hidden="true" />
                            : <Check className="h-7 w-7" aria-hidden="true" />}
                    </div>
                    <h1 className="mt-3 text-xl font-black text-foreground">
                        {isIncomplete ? 'Entrenamiento finalizado con pendientes' : 'Entrenamiento guardado'}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {dayLabel} · {summary.totalSets} de {summary.plannedSets} series · {formatDuration(summary.durationSeconds)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {isIncomplete
                            ? 'Este día no cuenta como completado todavía. Podés volver ahora o más adelante para registrar las series pendientes.'
                            : 'Si necesitás corregir un peso, podés volver a abrir este día.'}
                    </p>
                </section>

                {!isIncomplete && (
                    <WorkoutFeedbackForm sessionId={sessionId} studentId={studentId} />
                )}

                {isIncomplete ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSummary(null)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="min-h-12 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                        >
                            Completar pendientes
                        </button>
                        <button type="button" onClick={() => router.push(routineHref)} className="min-h-12 rounded-xl border border-border bg-secondary px-4 text-sm font-bold text-foreground">{returnLabel}</button>
                    </div>
                ) : (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => router.push(routineHref)} className="min-h-12 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{returnLabel}</button>
                        <button type="button" onClick={() => router.push(progressHref)} className="min-h-12 rounded-xl border border-border bg-secondary px-4 text-sm font-bold text-foreground">Ver progreso</button>
                    </div>
                )}
            </main>
        )
    }

    return (
        <main className="mx-auto max-w-lg px-4 pb-40 pt-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Entrenamiento</p>
                    <h1 className="mt-0.5 text-xl font-black text-foreground">{dayLabel}</h1>
                </div>
                {completedSession && <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-500">Finalizada · editable</span>}
                {incompleteSession && <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-500">Incompleta · editable</span>}
            </div>

            <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{savedSets} de {totalPlannedSets} series</span>
                    <span>{progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {!isOnline && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 text-amber-400">
                    <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="text-xs leading-5">
                        {hasSafeLocalDraft
                            ? 'Sin conexión. Podés seguir completando: guardamos el borrador en este teléfono.'
                            : draftStorageStatus === 'unavailable'
                                ? 'Sin conexión. Este dispositivo no pudo guardar el borrador. No cierres la app.'
                                : 'Sin conexión. Estamos guardando tus cambios; no cierres la app.'}
                    </p>
                </div>
            )}

            {isOnline && syncingDrafts && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.07] px-3 py-2.5 text-primary">
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <p className="text-xs font-medium">Sincronizando cambios pendientes…</p>
                </div>
            )}

            {isOnline && !syncingDrafts && draftRecovered && hasDraftChanges && !hasQueuedChanges && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2.5 text-emerald-500">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="text-xs leading-5">Recuperamos el borrador que habías dejado en este entrenamiento.</p>
                </div>
            )}

            {completedSession && (
                <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2 text-xs leading-5 text-emerald-500">
                    Esta sesión ya terminó. Podés corregir cualquier peso o repetición y guardar la serie nuevamente; la duración original no cambia.
                </p>
            )}

            {incompleteSession && (
                <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs leading-5 text-amber-500">
                    Este día quedó incompleto y todavía no suma como entrenamiento realizado. Completá las series pendientes y volvé a finalizarlo.
                </p>
            )}

            {restTimeLeft > 0 && (
                <div className="sticky top-[86px] z-20 mt-3 flex items-center gap-3 rounded-xl border border-primary/25 bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur">
                    <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
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
                                        <article key={exercise.id} className={`overflow-hidden rounded-2xl border bg-card ${isOpen ? 'border-primary/35' : 'border-border'}`}>
                                            <button
                                                type="button"
                                                onClick={() => setOpenExerciseId(isOpen ? null : exercise.id)}
                                                className="flex min-h-16 w-full items-center gap-3 px-3.5 py-3 text-left"
                                                aria-expanded={isOpen}
                                            >
                                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${completed === exercise.setsCount ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'}`}>
                                                    {completed === exercise.setsCount ? '✓' : exerciseIndex + 1}
                                                </span>
                                                    <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-bold text-foreground">{exercise.exerciseName}</span>
                                                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                                            {exercise.setsCount}{exercise.targetReps ? ` × ${exercise.targetReps}${exercise.isCardio ? ' min' : ' reps'}` : ' series'} · {completed}/{exercise.setsCount} listas
                                                    </span>
                                                </span>
                                                {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-border px-3.5 pb-3.5 pt-3">
                                                    <ExerciseDemo
                                                        exerciseName={exercise.exerciseName}
                                                        videoUrl={exercise.video_url}
                                                        instructions={exercise.instructions}
                                                        muscleGroup={exercise.muscleGroup}
                                                        category={exercise.category}
                                                    />

                                                    <div className="mt-3">
                                                        <div className={`mb-1.5 grid items-end gap-2 px-2 ${exercise.isCardio ? 'grid-cols-[2rem_minmax(0,1fr)_4.75rem]' : 'grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_4.75rem]'}`}>
                                                            <span className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Serie</span>
                                                            {!exercise.isCardio && <span className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Peso</span>}
                                                            <span className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{exercise.isCardio ? 'Minutos' : 'Reps'}</span>
                                                            <span className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Guardar</span>
                                                        </div>

                                                        <div className="space-y-2">
                                                        {exerciseSets.map((set, setIndex) => {
                                                            const key = `${exerciseIndex}-${setIndex}`
                                                            return (
                                                                <div key={setIndex} className={`rounded-xl border px-2 py-2 ${set.dirty ? 'border-amber-500/35 bg-amber-500/[0.04]' : set.saved ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-border bg-background/50'}`}>
                                                                    <div className={`grid items-center gap-2 ${exercise.isCardio ? 'grid-cols-[2rem_minmax(0,1fr)_4.75rem]' : 'grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_4.75rem]'}`}>
                                                                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${set.saved && !set.dirty ? 'bg-emerald-500/15 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                                                                            {setIndex + 1}
                                                                        </span>

                                                                        {!exercise.isCardio && (
                                                                            <input
                                                                                aria-label={`Peso serie ${setIndex + 1}`}
                                                                                type="number"
                                                                                inputMode="decimal"
                                                                                step="0.5"
                                                                                placeholder="—"
                                                                                value={set.weight}
                                                                                disabled={finishing}
                                                                                onChange={(event) => updateField(exerciseIndex, setIndex, 'weight', event.target.value)}
                                                                                className="h-10 min-w-0 w-full rounded-lg border border-border bg-background px-2 text-center text-base font-bold text-foreground outline-none focus:border-primary"
                                                                            />
                                                                        )}

                                                                        <input
                                                                            aria-label={`${exercise.isCardio ? 'Minutos' : 'Repeticiones'} serie ${setIndex + 1}`}
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            placeholder="—"
                                                                            value={set.reps}
                                                                            disabled={finishing}
                                                                            onChange={(event) => updateField(exerciseIndex, setIndex, 'reps', event.target.value)}
                                                                            className="h-10 min-w-0 w-full rounded-lg border border-border bg-background px-2 text-center text-base font-bold text-foreground outline-none focus:border-primary"
                                                                        />

                                                                        <button
                                                                            type="button"
                                                                            aria-label={`Guardar serie ${setIndex + 1}`}
                                                                            onClick={() => saveOneSet(exerciseIndex, setIndex)}
                                                                            disabled={finishing || savingKey != null || set.queued || (!set.dirty && set.saved)}
                                                                            className={`inline-flex h-10 w-full items-center justify-center rounded-lg px-1 text-xs font-bold disabled:opacity-55 ${set.queued ? 'bg-amber-700 text-white' : set.saved && !set.dirty ? 'bg-emerald-700 text-white' : 'bg-primary text-primary-foreground'}`}
                                                                        >
                                                                            {savingKey === key ? 'Guardando…' : set.queued ? 'Pendiente' : set.saved ? 'Actualizar' : 'Guardar'}
                                                                        </button>
                                                                    </div>

                                                                    <div className={`mt-1 grid gap-2 pl-10 pr-[5.25rem] ${exercise.isCardio ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                                        {!exercise.isCardio && (
                                                                            <span className="truncate text-center text-[11px] text-muted-foreground">
                                                                                {exercise.previousWeights[setIndex] != null ? `Anterior ${exercise.previousWeights[setIndex]} ${weightUnit}` : 'Sin peso anterior'}
                                                                            </span>
                                                                        )}
                                                                        <span className="truncate text-center text-[11px] text-muted-foreground">
                                                                            {exercise.previousReps[setIndex] != null
                                                                                ? `Anterior ${exercise.previousReps[setIndex]} ${exercise.isCardio ? 'min' : 'reps'}`
                                                                                : exercise.targetReps ? `Objetivo ${exercise.targetReps}` : 'Sin registro anterior'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="mt-1.5 flex items-center justify-between gap-2 pl-10">
                                                                        <details className="min-w-0 flex-1">
                                                                            <summary className="cursor-pointer list-none text-[10px] font-medium text-muted-foreground underline decoration-dotted underline-offset-2">
                                                                                {set.rpe ? `Esfuerzo ${set.rpe}/10` : 'Agregar esfuerzo (opcional)'}
                                                                            </summary>
                                                                            <label className="mt-2 flex items-center gap-2">
                                                                                <span className="text-[10px] text-muted-foreground">Esfuerzo</span>
                                                                                <select
                                                                                    aria-label="Esfuerzo opcional"
                                                                                    value={set.rpe}
                                                                                    disabled={finishing}
                                                                                    onChange={(event) => updateField(exerciseIndex, setIndex, 'rpe', event.target.value)}
                                                                                    className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                                                                                >
                                                                                    <option value="">Sin indicar</option>
                                                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => <option key={value} value={value}>{value}/10</option>)}
                                                                                </select>
                                                                            </label>
                                                                        </details>
                                                                        <span className={`shrink-0 text-[9px] font-bold ${set.queued || set.dirty ? 'text-amber-500' : set.saved ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                                                            {set.queued
                                                                                ? isOnline
                                                                                    ? 'Por sincronizar'
                                                                                    : hasSafeLocalDraft ? 'Sin conexión · guardado' : 'No cierres la app'
                                                                                : set.dirty
                                                                                    ? draftStorageStatus === 'unavailable'
                                                                                        ? 'No cierres la app'
                                                                                        : hasSafeLocalDraft ? 'Borrador guardado' : 'Guardando borrador…'
                                                                                    : set.saved ? 'Guardada ✓' : 'Pendiente'}
                                                                        </span>
                                                                    </div>

                                                                    {set.isPr && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-500"><Trophy className="h-3.5 w-3.5" /> Nuevo mejor peso</p>}
                                                                    {set.error && <p className="mt-2 text-[11px] font-medium text-red-500">{set.error}</p>}
                                                                </div>
                                                            )
                                                        })}
                                                        </div>
                                                    </div>

                                                    <details className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.05]">
                                                        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-xs font-bold text-amber-500">
                                                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                                            ¿Sentís molestia? Frená y avisá
                                                        </summary>
                                                        <div className="border-t border-amber-500/20 p-3">
                                                            <p className="mb-3 text-xs leading-5 text-muted-foreground">
                                                                Si el dolor es agudo, apareció de golpe o empeora, no continúes este ejercicio. Contale a tu entrenador qué sentís para que pueda adaptar la rutina.
                                                            </p>
                                                            <MessageComposer
                                                                routineDayExerciseId={exercise.id}
                                                                workoutSessionId={sessionId}
                                                                defaultTopic="pain"
                                                                placeholder={`¿Dónde sentís la molestia al hacer ${exercise.exerciseName}?`}
                                                                compact
                                                                showTopic={false}
                                                                successMessage="Tu entrenador fue avisado ✓"
                                                                successHref="/app/messages"
                                                            />
                                                            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                                                                Si el dolor es intenso o necesitás atención, consultá a un profesional de salud o a un servicio de emergencias.
                                                            </p>
                                                        </div>
                                                    </details>

                                                    <details className="mt-3 rounded-xl border border-border bg-background/60">
                                                        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-primary">
                                                            <MessageCircle className="h-4 w-4" />
                                                            Tengo una duda sobre este ejercicio
                                                        </summary>
                                                        <div className="border-t border-border p-3">
                                                            <MessageComposer
                                                                routineDayExerciseId={exercise.id}
                                                                workoutSessionId={sessionId}
                                                                defaultTopic="question"
                                                                placeholder={`Consulta sobre ${exercise.exerciseName}…`}
                                                                compact
                                                            />
                                                        </div>
                                                    </details>
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
                        <button type="button" onClick={() => finishWorkout(false)} disabled={finishing} className="min-h-12 flex-1 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
                            {finishing ? 'Finalizando…' : 'Finalizar entrenamiento'}
                        </button>
                    )}
                </div>
            </div>

            {finishConfirmation && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4 pb-24" role="presentation">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="incomplete-workout-title"
                        aria-describedby="incomplete-workout-description"
                        className="max-h-[calc(100dvh-7rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <h2 id="incomplete-workout-title" className="mt-3 text-lg font-black text-foreground">¿Finalizar entrenamiento incompleto?</h2>
                        <p id="incomplete-workout-description" className="mt-2 text-sm leading-6 text-muted-foreground">
                            Te quedan {finishConfirmation.plannedSets - finishConfirmation.completedSets} de {finishConfirmation.plannedSets} series sin registrar.
                            Si terminás ahora, el día quedará incompleto y no contará como entrenamiento completado.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                ref={continueTrainingButtonRef}
                                onClick={() => setFinishConfirmation(null)}
                                className="min-h-12 rounded-xl border border-border bg-secondary px-3 text-sm font-bold text-foreground"
                            >
                                Seguir entrenando
                            </button>
                            <button
                                type="button"
                                onClick={() => finishWorkout(true)}
                                disabled={finishing}
                                className="min-h-12 rounded-xl bg-amber-500 px-3 text-sm font-black text-black disabled:opacity-50"
                            >
                                {finishing ? 'Finalizando…' : 'Finalizar incompleto'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    )
}

function setsForExerciseIncomplete(exercise: ExerciseData, sets: SetState[]) {
    return sets.filter((set) => set.saved).length < exercise.setsCount
}
