export type ExerciseMetric = 'reps' | 'minutes' | 'seconds'

export type ExerciseMetricFields = {
    metric_type: string | null
    duration_unit: string | null
}

export const EXERCISE_METRIC_LABELS = {
    reps: 'Repeticiones',
    minutes: 'Minutos',
    seconds: 'Segundos',
} as const

export const EXERCISE_METRIC_SUFFIXES = {
    reps: 'reps',
    minutes: 'min',
    seconds: 's',
} as const

export const EXERCISE_METRIC_OPTIONS: ReadonlyArray<{ value: ExerciseMetric; label: string }> = [
    { value: 'reps', label: 'Repeticiones' },
    { value: 'seconds', label: 'Tiempo (segundos)' },
    { value: 'minutes', label: 'Tiempo (minutos)' },
]

export function isExerciseMetric(value: unknown): value is ExerciseMetric {
    return value === 'reps' || value === 'seconds' || value === 'minutes'
}

export function getExerciseMetric(fields?: ExerciseMetricFields | null): ExerciseMetric {
    if (fields?.metric_type !== 'time') return 'reps'
    return fields.duration_unit === 'seconds' ? 'seconds' : 'minutes'
}

export function exerciseMetricFields(metric: ExerciseMetric) {
    if (metric === 'reps') return { metric_type: 'reps', duration_unit: null } as const
    return { metric_type: 'time', duration_unit: metric } as const
}
