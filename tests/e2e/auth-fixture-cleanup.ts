import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthFixtureRefs = {
    userIds: string[]
    trainerIds: string[]
    studentIds: string[]
    routineIds?: string[]
    exerciseIds?: string[]
}

function unique(values: (string | null | undefined)[]) {
    return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function assertNoError(error: { message: string } | null, operation: string) {
    if (error) throw new Error(`${operation}: ${error.message}`)
}

export async function removeAuthFixtureData(admin: SupabaseClient, refs: AuthFixtureRefs) {
    const userIds = unique(refs.userIds)
    const trainerIds = unique(refs.trainerIds)
    const studentIds = unique(refs.studentIds)

    const { data: trainerRoutines, error: trainerRoutinesError } = trainerIds.length > 0
        ? await admin.from('routines').select('id').in('trainer_id', trainerIds)
        : { data: [], error: null }
    assertNoError(trainerRoutinesError, 'No se pudieron localizar las rutinas E2E')

    const routineIds = unique([
        ...(refs.routineIds ?? []),
        ...(trainerRoutines ?? []).map((row) => row.id),
    ])

    const { data: routineDays, error: routineDaysError } = routineIds.length > 0
        ? await admin.from('routine_days').select('id').in('routine_id', routineIds)
        : { data: [], error: null }
    assertNoError(routineDaysError, 'No se pudieron localizar los días E2E')
    const routineDayIds = unique((routineDays ?? []).map((row) => row.id))

    const { data: trainerExercises, error: trainerExercisesError } = trainerIds.length > 0
        ? await admin.from('exercises').select('id').in('trainer_id', trainerIds)
        : { data: [], error: null }
    assertNoError(trainerExercisesError, 'No se pudieron localizar los ejercicios E2E')

    const exerciseIds = unique([
        ...(refs.exerciseIds ?? []),
        ...(trainerExercises ?? []).map((row) => row.id),
    ])

    if (studentIds.length > 0) {
        const logs = await admin.from('exercise_logs').delete().in('student_id', studentIds)
        assertNoError(logs.error, 'No se pudieron eliminar las series E2E')

        const sessions = await admin.from('workout_sessions').delete().in('student_id', studentIds)
        assertNoError(sessions.error, 'No se pudieron eliminar las sesiones E2E')

        const assignments = await admin.from('student_routines').delete().in('student_id', studentIds)
        assertNoError(assignments.error, 'No se pudieron eliminar las asignaciones E2E')
    }

    if (routineDayIds.length > 0) {
        const dayExercises = await admin.from('routine_day_exercises').delete().in('routine_day_id', routineDayIds)
        assertNoError(dayExercises.error, 'No se pudieron eliminar los ejercicios de rutina E2E')

        const days = await admin.from('routine_days').delete().in('id', routineDayIds)
        assertNoError(days.error, 'No se pudieron eliminar los días E2E')
    }

    if (routineIds.length > 0) {
        const weeks = await admin.from('routine_weeks').delete().in('routine_id', routineIds)
        assertNoError(weeks.error, 'No se pudieron eliminar las semanas E2E')

        const months = await admin.from('routine_months').delete().in('routine_id', routineIds)
        assertNoError(months.error, 'No se pudieron eliminar los mesociclos E2E')

        const routines = await admin.from('routines').delete().in('id', routineIds)
        assertNoError(routines.error, 'No se pudieron eliminar las rutinas E2E')
    }

    if (exerciseIds.length > 0) {
        const exercises = await admin.from('exercises').delete().in('id', exerciseIds)
        assertNoError(exercises.error, 'No se pudieron eliminar los ejercicios E2E')
    }

    if (userIds.length > 0) {
        const profiles = await admin.from('profiles').delete().in('id', userIds)
        assertNoError(profiles.error, 'No se pudieron eliminar los perfiles E2E')
    }

    if (studentIds.length > 0) {
        const students = await admin.from('students').delete().in('id', studentIds)
        assertNoError(students.error, 'No se pudieron eliminar los alumnos E2E')
    }

    if (trainerIds.length > 0) {
        const trainers = await admin.from('trainers').delete().in('id', trainerIds)
        assertNoError(trainers.error, 'No se pudieron eliminar los entrenadores E2E')
    }

    for (const userId of userIds) {
        const { error } = await admin.auth.admin.deleteUser(userId)
        assertNoError(error, 'No se pudo eliminar un usuario de acceso E2E')
    }
}
