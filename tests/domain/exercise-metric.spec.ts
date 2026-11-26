import { expect, test } from '@playwright/test'
import {
    EXERCISE_METRIC_SUFFIXES,
    exerciseMetricFields,
    getExerciseMetric,
    isExerciseMetric,
} from '../../src/lib/exerciseMetric'

test('existing repetition and duration records keep their units', () => {
    expect(getExerciseMetric({ metric_type: 'reps', duration_unit: null })).toBe('reps')
    expect(getExerciseMetric({ metric_type: 'time', duration_unit: null })).toBe('minutes')
    expect(getExerciseMetric({ metric_type: null, duration_unit: null })).toBe('reps')
})

test('new duration variants distinguish seconds from minutes', () => {
    expect(exerciseMetricFields('seconds')).toEqual({ metric_type: 'time', duration_unit: 'seconds' })
    expect(exerciseMetricFields('minutes')).toEqual({ metric_type: 'time', duration_unit: 'minutes' })
    expect(getExerciseMetric(exerciseMetricFields('seconds'))).toBe('seconds')
    expect(getExerciseMetric(exerciseMetricFields('minutes'))).toBe('minutes')
    expect(EXERCISE_METRIC_SUFFIXES.seconds).toBe('s')
    expect(EXERCISE_METRIC_SUFFIXES.minutes).toBe('min')
    expect(isExerciseMetric('time')).toBe(false)
})
