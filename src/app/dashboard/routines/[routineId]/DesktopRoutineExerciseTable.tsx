'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Check,
    ChevronDown,
    ChevronUp,
    History,
    Loader2,
    Plus,
    Save,
    Trash2,
    X,
} from 'lucide-react'
import ExerciseProgressChart from '@/components/ExerciseProgressChart'
import { EXERCISE_METRIC_LABELS, EXERCISE_METRIC_OPTIONS, EXERCISE_METRIC_SUFFIXES, getExerciseMetric, type ExerciseMetric, type ExerciseMetricFields } from '@/lib/exerciseMetric'
import { convertWeightFromKgForInput, formatWeight, type WeightUnit } from '@/lib/weight'
import type {
    Block,
    DayExercise,
    ExerciseLog,
    ExerciseOption,
} from './DayBlockEditor'

type RoutineActionResult = {
    ok: boolean
    error?: string
}

type ExerciseRelation = ExerciseMetricFields & {
    name: string
    muscle_group: string | null
}

type Props = {
    routineId: string
    routineDayId: string
    exercises: DayExercise[]
    exerciseOptions: ExerciseOption[]
    defaultSets: number
    defaultReps: number
    defaultRest: number
    addAction: (fd: FormData) => Promise<RoutineActionResult>
    createExerciseAction: (input: {
        routineId: string
        name: string
        category?: string
        metricType?: ExerciseMetric
    }) => Promise<{ ok: boolean; exercise?: ExerciseOption; error?: string }>
    updateAction: (fd: FormData) => Promise<RoutineActionResult>
    moveAction: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
    deleteAction: (fd: FormData) => Promise<void>
    weekId: string
    logsByExercise: Record<string, ExerciseLog[]>
    weightUnit: WeightUnit
    showHistory?: boolean
}

const BLOCK_META: Array<{ id: Block; label: string }> = [
    { id: 'activation', label: 'Activación' },
    { id: 'main', label: 'Bloque principal' },
    { id: 'closing', label: 'Cierre' },
]

const ROW_GRID_WITH_HISTORY =
    'grid-cols-[2rem_minmax(13rem,1.7fr)_minmax(8.5rem,0.75fr)_4.5rem_4.5rem_5.25rem_5.25rem_minmax(8rem,0.7fr)_9rem]'
const ROW_GRID_WITHOUT_HISTORY =
    'grid-cols-[2rem_minmax(15rem,2fr)_minmax(8.5rem,0.8fr)_4.5rem_4.5rem_5.25rem_5.25rem_9rem]'

export default function DesktopRoutineExerciseTable({
    routineId,
    routineDayId,
    exercises,
    exerciseOptions,
    defaultSets,
    defaultReps,
    defaultRest,
    addAction,
    createExerciseAction,
    updateAction,
    moveAction,
    deleteAction,
    weekId,
    logsByExercise,
    weightUnit,
    showHistory = true,
}: Props) {
    const rowGrid = showHistory ? ROW_GRID_WITH_HISTORY : ROW_GRID_WITHOUT_HISTORY

    return (
        <div className="flex max-h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="min-h-0 flex-1 overflow-auto">
                <div className={showHistory ? 'min-w-[1060px]' : 'min-w-[930px]'}>
                    <div
                        className={`sticky top-0 z-20 grid ${rowGrid} items-center gap-2 border-b border-border bg-card px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-sm`}
                    >
                        <span>#</span>
                        <span>Ejercicio</span>
                        <span>Sección</span>
                        <span>Series</span>
                        <span>Reps / tiempo</span>
                        <span>Peso sug. ({weightUnit})</span>
                        <span>Descanso</span>
                        {showHistory && <span>Último registro</span>}
                        <span className="text-right">Acciones</span>
                    </div>

                    {BLOCK_META.map((block) => {
                        const blockExercises = exercises.filter(
                            (exercise) => exercise.block === block.id
                        )

                        return (
                            <section key={block.id} aria-label={block.label}>
                                <div className="flex items-center gap-2 border-b border-border bg-primary/[0.055] px-3 py-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                                        {block.label}
                                    </span>
                                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                                        {blockExercises.length}
                                    </span>
                                </div>

                                {blockExercises.length === 0 ? (
                                    <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
                                        Sin ejercicios en este bloque.
                                    </div>
                                ) : (
                                    blockExercises.map((exercise, index) => (
                                        <DesktopExerciseRow
                                            key={exercise.id}
                                            exercise={exercise}
                                            index={exercises.findIndex((item) => item.id === exercise.id)}
                                            exerciseOptions={exerciseOptions}
                                            routineId={routineId}
                                            dayId={routineDayId}
                                            weekId={weekId}
                                            updateAction={updateAction}
                                            moveAction={moveAction}
                                            deleteAction={deleteAction}
                                            canMoveUp={index > 0}
                                            canMoveDown={index < blockExercises.length - 1}
                                            logs={logsByExercise[exercise.id] ?? []}
                                            weightUnit={weightUnit}
                                            historyEnabled={showHistory}
                                            rowGrid={rowGrid}
                                        />
                                    ))
                                )}
                            </section>
                        )
                    })}
                </div>
            </div>

            <DesktopAddExerciseRow
                routineId={routineId}
                routineDayId={routineDayId}
                exerciseOptions={exerciseOptions}
                defaultSets={defaultSets}
                defaultReps={defaultReps}
                defaultRest={defaultRest}
                weightUnit={weightUnit}
                addAction={addAction}
                createExerciseAction={createExerciseAction}
            />
        </div>
    )
}

function DesktopExerciseRow({
    exercise,
    index,
    exerciseOptions,
    routineId,
    dayId,
    weekId,
    updateAction,
    moveAction,
    deleteAction,
    canMoveUp,
    canMoveDown,
    logs,
    weightUnit,
    historyEnabled,
    rowGrid,
}: {
    exercise: DayExercise
    index: number
    exerciseOptions: ExerciseOption[]
    routineId: string
    dayId: string
    weekId: string
    updateAction: (fd: FormData) => Promise<RoutineActionResult>
    moveAction: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
    deleteAction: (fd: FormData) => Promise<void>
    canMoveUp: boolean
    canMoveDown: boolean
    logs: ExerciseLog[]
    weightUnit: WeightUnit
    historyEnabled: boolean
    rowGrid: string
}) {
    const relation = Array.isArray(exercise.exercise)
        ? exercise.exercise[0]
        : exercise.exercise
    const initialName = relation?.name ?? ''
    const originalMetric = getExerciseMetric(relation)
    const [name, setName] = useState(initialName)
    const [block, setBlock] = useState<Block>(exercise.block)
    const [sets, setSets] = useState(String(exercise.sets ?? ''))
    const [amount, setAmount] = useState({ metric: originalMetric, value: String(exercise.reps ?? '') })
    const [targetWeight, setTargetWeight] = useState(
        exercise.target_weight_kg == null ? '' : String(convertWeightFromKgForInput(exercise.target_weight_kg, weightUnit))
    )
    const [rest, setRest] = useState(String(exercise.rest_seconds ?? ''))
    const [message, setMessage] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        setName(initialName)
        setBlock(exercise.block)
        setSets(String(exercise.sets ?? ''))
        setAmount({ metric: originalMetric, value: String(exercise.reps ?? '') })
        setTargetWeight(exercise.target_weight_kg == null ? '' : String(convertWeightFromKgForInput(exercise.target_weight_kg, weightUnit)))
        setRest(String(exercise.rest_seconds ?? ''))
    }, [exercise.block, exercise.reps, exercise.rest_seconds, exercise.sets, exercise.target_weight_kg, initialName, originalMetric, weightUnit])

    const replacementExercise = exerciseOptions.find(
        (option) => option.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase()
    )
    const keepsCurrentExercise =
        name.trim().toLocaleLowerCase() === initialName.trim().toLocaleLowerCase()
    const replacementExerciseId = keepsCurrentExercise ? exercise.exercise_id : (replacementExercise?.id ?? '')
    const metric = keepsCurrentExercise || !replacementExercise ? originalMetric : getExerciseMetric(replacementExercise)
    const isTime = metric !== 'reps'
    const reps = amount.metric === metric ? amount.value : ''
    const isDirty =
        name !== initialName ||
        block !== exercise.block ||
        sets !== String(exercise.sets ?? '') ||
        reps !== String(exercise.reps ?? '') ||
        targetWeight !== (exercise.target_weight_kg == null ? '' : String(convertWeightFromKgForInput(exercise.target_weight_kg, weightUnit))) ||
        rest !== String(exercise.rest_seconds ?? '')
    const latestLog = logs[0]

    function move(direction: 'up' | 'down') {
        const formData = new FormData()
        formData.set('routineId', routineId)
        formData.set('exerciseRowId', exercise.id)
        formData.set('direction', direction)
        setMessage(null)
        startTransition(async () => {
            const result = await moveAction(formData)
            if (!result.ok) {
                setMessage(result.error ?? 'No se pudo cambiar el orden.')
                return
            }
            router.refresh()
        })
    }

    return (
        <div
            data-testid={`exercise-row-${exercise.id}`}
            className="border-b border-border last:border-b-0"
        >
            <form
                action={(formData) => {
                    setMessage(null)
                    startTransition(async () => {
                        const result = await updateAction(formData)
                        if (!result.ok) {
                            setMessage(result.error ?? 'No se pudo guardar.')
                            return
                        }
                        setMessage('Guardado')
                        router.refresh()
                    })
                }}
                className={`grid ${rowGrid} items-center gap-2 px-3 py-2.5 transition ${isDirty ? 'bg-primary/[0.035]' : 'hover:bg-muted/20'}`}
            >
                <input type="hidden" name="routineId" value={routineId} />
                <input type="hidden" name="dayId" value={dayId} />
                <input type="hidden" name="weekId" value={weekId} />
                <input type="hidden" name="exerciseRowId" value={exercise.id} />
                <input
                    type="hidden"
                    name="replacementExerciseId"
                    value={replacementExerciseId}
                />
                <input type="hidden" name="exerciseId" value={exercise.id} />
                <input type="hidden" name="weight_unit" value={weightUnit} />
                {searchParams.get('month') && (
                    <input type="hidden" name="monthId" value={searchParams.get('month') ?? ''} />
                )}

                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                    {index + 1}
                </span>

                <div>
                    <input
                        aria-label={`Ejercicio ${index + 1}`}
                        list={`desktop-exercise-options-${exercise.id}`}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-foreground outline-none transition hover:border-border hover:bg-background focus:border-primary focus:bg-background"
                    />
                    <datalist id={`desktop-exercise-options-${exercise.id}`}>
                        {exerciseOptions.map((option) => (
                            <option key={option.id} value={option.name}>
                                {EXERCISE_METRIC_LABELS[getExerciseMetric(option)]}
                            </option>
                        ))}
                    </datalist>
                    {name.trim() && !replacementExerciseId && (
                        <span className="px-2 text-[10px] text-amber-500">
                            Elegí un ejercicio de la lista.
                        </span>
                    )}
                </div>

                <select
                    aria-label={`Bloque de ${initialName}`}
                    name="block"
                    value={block}
                    onChange={(event) => setBlock(event.target.value as Block)}
                    className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                >
                    {BLOCK_META.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <CompactNumberInput label={`Series de ${initialName}`} name="sets" value={sets} onChange={setSets} min={1} />
                <CompactNumberInput label={`${EXERCISE_METRIC_LABELS[metric]} de ${initialName}`} name="reps" value={reps} onChange={(value) => setAmount({ metric, value })} min={1} suffix={isTime ? EXERCISE_METRIC_SUFFIXES[metric] : undefined} />
                <CompactNumberInput label={`Peso sugerido de ${initialName}`} name="target_weight" value={isTime ? '' : targetWeight} onChange={setTargetWeight} min={0.5} step={weightUnit === 'lb' ? 0.01 : 0.5} suffix={weightUnit} required={false} disabled={isTime} placeholder={isTime ? '—' : 'Opc.'} />
                <CompactNumberInput label={`Descanso de ${initialName}`} name="rest_seconds" value={rest} onChange={setRest} min={0} step={15} suffix="s" required={false} />

                {historyEnabled && (
                    <button
                        type="button"
                        onClick={() => setShowHistory((current) => !current)}
                        disabled={logs.length === 0}
                        className="min-w-0 rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-default"
                        aria-expanded={showHistory}
                    >
                        {latestLog ? (
                            <>
                                <span className="block truncate font-medium text-foreground">
                                    {originalMetric !== 'reps'
                                        ? `${latestLog.reps ?? '-'} ${EXERCISE_METRIC_SUFFIXES[originalMetric]}`
                                        : `${latestLog.weight != null ? formatWeight(latestLog.weight, weightUnit) : '-'} · ${latestLog.reps ?? '-'} reps`}
                                </span>
                                <span className="flex items-center gap-1">
                                    <History className="h-3 w-3" /> Ver historial
                                </span>
                            </>
                        ) : (
                            'Sin registros'
                        )}
                    </button>
                )}

                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => move('up')}
                        disabled={isPending || !canMoveUp}
                        aria-label={`Mover ${initialName} arriba`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25"
                    >
                        <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => move('down')}
                        disabled={isPending || !canMoveDown}
                        aria-label={`Mover ${initialName} abajo`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </button>

                    {confirmDelete ? (
                        <>
                            <button
                                type="submit"
                                formAction={deleteAction}
                                disabled={isPending}
                                className="h-8 rounded-md bg-red-600 px-2 text-[10px] font-semibold text-white"
                            >
                                Eliminar
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                                aria-label="Cancelar eliminación"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            aria-label={`Eliminar ${initialName}`}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={isPending || !isDirty || !replacementExerciseId}
                        className="flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground transition disabled:bg-secondary disabled:text-muted-foreground"
                    >
                        {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : message === 'Guardado' ? (
                            <Check className="h-3.5 w-3.5" />
                        ) : (
                            <Save className="h-3.5 w-3.5" />
                        )}
                        {message === 'Guardado' ? 'Listo' : 'Guardar'}
                    </button>
                </div>
            </form>

            {message && message !== 'Guardado' && (
                <p role="alert" className="px-12 pb-2 text-xs font-medium text-red-500">
                    {message}
                </p>
            )}

            {historyEnabled && showHistory && logs.length > 0 && (
                <DesktopExerciseHistory logs={logs} relation={relation} weightUnit={weightUnit} />
            )}
        </div>
    )
}

function CompactNumberInput({
    label,
    name,
    value,
    onChange,
    min,
    step = 1,
    suffix,
    required = true,
    disabled = false,
    placeholder,
}: {
    label: string
    name: string
    value: string
    onChange: (value: string) => void
    min: number
    step?: number
    suffix?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
}) {
    return (
        <div className="relative">
            <input
                aria-label={label}
                name={name}
                type="number"
                min={min}
                step={step}
                required={required}
                disabled={disabled}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-center text-xs font-semibold text-foreground outline-none focus:border-primary disabled:bg-muted/40 disabled:text-muted-foreground"
            />
            {suffix && value && (
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
                    {suffix}
                </span>
            )}
        </div>
    )
}

function DesktopAddExerciseRow({
    routineId,
    routineDayId,
    exerciseOptions,
    defaultSets,
    defaultReps,
    defaultRest,
    weightUnit,
    addAction,
    createExerciseAction,
}: {
    routineId: string
    routineDayId: string
    exerciseOptions: ExerciseOption[]
    defaultSets: number
    defaultReps: number
    defaultRest: number
    weightUnit: WeightUnit
    addAction: (fd: FormData) => Promise<RoutineActionResult>
    createExerciseAction: Props['createExerciseAction']
}) {
    const [expanded, setExpanded] = useState(false)
    const [availableExercises, setAvailableExercises] = useState(exerciseOptions)
    const [name, setName] = useState('')
    const [block, setBlock] = useState<Block>('main')
    const [sets, setSets] = useState(String(defaultSets))
    const [amount, setAmount] = useState<{ metric: ExerciseMetric; value: string }>({ metric: 'reps', value: String(defaultReps) })
    const [targetWeight, setTargetWeight] = useState('')
    const [rest, setRest] = useState(String(defaultRest))
    const [metricType, setMetricType] = useState<ExerciseMetric>('reps')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    useEffect(() => setAvailableExercises(exerciseOptions), [exerciseOptions])

    const selectedExercise = useMemo(
        () => availableExercises.find(
            (exercise) => exercise.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase()
        ) ?? null,
        [availableExercises, name]
    )
    const metric = getExerciseMetric(selectedExercise)
    const isTime = metric !== 'reps'
    const reps = amount.metric === metric ? amount.value : metric === 'reps' ? String(defaultReps) : ''

    function reset() {
        setName('')
        setBlock('main')
        setSets(String(defaultSets))
        setAmount({ metric: 'reps', value: String(defaultReps) })
        setTargetWeight('')
        setRest(String(defaultRest))
        setMetricType('reps')
        setError(null)
    }

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex w-full items-center justify-center gap-2 border-t border-border bg-primary/[0.045] px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
                <Plus className="h-4 w-4" />
                Agregar ejercicio al día
            </button>
        )
    }

    return (
        <div className="overflow-x-auto border-t border-border bg-muted/15 p-3">
            <form
                action={(formData) => {
                    setError(null)
                    startTransition(async () => {
                        const result = await addAction(formData)
                        if (!result.ok) {
                            setError(result.error ?? 'No se pudo agregar el ejercicio.')
                            return
                        }
                        reset()
                        router.refresh()
                    })
                }}
                className="grid min-w-[900px] grid-cols-[minmax(14rem,1.7fr)_minmax(8.5rem,0.75fr)_4.5rem_4.5rem_5.25rem_5.25rem_7rem_auto] items-end gap-2"
            >
                <input type="hidden" name="routineId" value={routineId} />
                <input type="hidden" name="routineDayId" value={routineDayId} />
                <input type="hidden" name="exercise_id" value={selectedExercise?.id ?? ''} />
                <input type="hidden" name="weight_unit" value={weightUnit} />

                <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Ejercicio
                    <input
                        autoFocus
                        list="desktop-new-exercise-options"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Buscar por nombre..."
                        className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm normal-case tracking-normal text-foreground outline-none focus:border-primary"
                    />
                    <datalist id="desktop-new-exercise-options">
                        {availableExercises.map((exercise) => (
                            <option key={exercise.id} value={exercise.name}>
                                {EXERCISE_METRIC_LABELS[getExerciseMetric(exercise)]}
                            </option>
                        ))}
                    </datalist>
                </label>

                <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Bloque
                    <select
                        name="block"
                        value={block}
                        onChange={(event) => setBlock(event.target.value as Block)}
                        className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground outline-none focus:border-primary"
                    >
                        {BLOCK_META.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                    </select>
                </label>

                <LabeledNumber name="sets" label="Series" value={sets} onChange={setSets} min={1} />
                <LabeledNumber name="reps" label={isTime ? EXERCISE_METRIC_LABELS[metric] : 'Reps'} value={reps} onChange={(value) => setAmount({ metric, value })} min={1} />
                <LabeledNumber name="target_weight" label={`Peso sug. (${weightUnit})`} value={isTime ? '' : targetWeight} onChange={setTargetWeight} min={0.5} step={weightUnit === 'lb' ? 0.01 : 0.5} required={false} disabled={isTime} placeholder={isTime ? '—' : 'Opc.'} />
                <LabeledNumber name="rest_seconds" label="Desc. (s)" value={rest} onChange={setRest} min={0} step={15} required={false} />

                <button
                    type="submit"
                    disabled={isPending || !selectedExercise}
                    className="flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Agregar
                </button>

                <button
                    type="button"
                    onClick={() => {
                        reset()
                        setExpanded(false)
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary"
                    aria-label="Cerrar nuevo ejercicio"
                >
                    <X className="h-4 w-4" />
                </button>
            </form>

            {name.trim() && !selectedExercise && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-dashed border-border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                        No existe “{name.trim()}”. Podés crearlo sin salir de la rutina.
                    </p>
                    <div className="flex items-center gap-2">
                        <select
                            value={metricType}
                            onChange={(event) => setMetricType(event.target.value as ExerciseMetric)}
                            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                        >
                            {EXERCISE_METRIC_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                                setError(null)
                                startTransition(async () => {
                                    const result = await createExerciseAction({
                                        routineId,
                                        name: name.trim(),
                                        metricType,
                                    })
                                    if (!result.ok || !result.exercise) {
                                        setError(result.error ?? 'No se pudo crear el ejercicio.')
                                        return
                                    }
                                    setAvailableExercises((current) => [...current, result.exercise!])
                                    setName(result.exercise.name)
                                })
                            }}
                            className="h-8 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary"
                        >
                            Crear ejercicio
                        </button>
                    </div>
                </div>
            )}

            {error && <p role="alert" className="mt-2 text-xs font-medium text-red-500">{error}</p>}
        </div>
    )
}

function LabeledNumber({
    name,
    label,
    value,
    onChange,
    min,
    step = 1,
    required = true,
    disabled = false,
    placeholder,
}: {
    name: string
    label: string
    value: string
    onChange: (value: string) => void
    min: number
    step?: number
    required?: boolean
    disabled?: boolean
    placeholder?: string
}) {
    return (
        <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
            <input
                name={name}
                type="number"
                min={min}
                step={step}
                required={required}
                disabled={disabled}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-center text-xs font-semibold normal-case tracking-normal text-foreground outline-none focus:border-primary disabled:bg-muted/40 disabled:text-muted-foreground"
            />
        </label>
    )
}

function DesktopExerciseHistory({
    logs,
    relation,
    weightUnit,
}: {
    logs: ExerciseLog[]
    relation: ExerciseRelation | null
    weightUnit: WeightUnit
}) {
    const metric = getExerciseMetric(relation)
    const isTime = metric !== 'reps'
    const recentLogs = logs.slice(0, 6)

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_18rem] gap-4 border-t border-border bg-muted/15 px-12 py-3">
            <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Registros recientes
                </p>
                <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
                    {recentLogs.map((log) => (
                        <div key={log.id} className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
                            <span className="block text-muted-foreground">
                                {(log.performed_at ?? '-').split('T')[0]}
                            </span>
                            <span className="font-semibold text-foreground">
                                {isTime
                                    ? `${log.reps ?? '-'} ${EXERCISE_METRIC_SUFFIXES[metric]}`
                                    : `${log.weight != null ? formatWeight(log.weight, weightUnit) : '-'} · ${log.reps ?? '-'} reps`}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            {!isTime && logs.length > 1 && (
                <div className="h-28 rounded-md border border-border bg-background p-2">
                    <ExerciseProgressChart logs={logs} />
                </div>
            )}
        </div>
    )
}
