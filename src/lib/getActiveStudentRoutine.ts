import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type SupabaseErrorLike = {
    code?: string
    message?: string
    details?: string
    hint?: string
}

export type ActiveStudentRoutine = {
    assignmentId: string
    routineId: string
    programStartedOn: string | null
    trainingWeekdays: number[] | null
}

function isMissingColumn(error: SupabaseErrorLike, column: string) {
    const description = [error.message, error.details, error.hint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

    return (error.code === '42703' || error.code === 'PGRST204')
        && description.includes(column)
}

function normalizeTrainingWeekdays(value: unknown) {
    if (!Array.isArray(value)) return null
    const weekdays = value.filter(
        (weekday): weekday is number => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7
    )
    if (weekdays.length !== value.length || new Set(weekdays).size !== weekdays.length) return null
    return weekdays
}

/**
 * Reads the active assignment while remaining compatible with databases that
 * have not applied routine_schedule_progression_migration.sql yet.
 */
export async function getActiveStudentRoutine(
    supabase: SupabaseServerClient,
    studentId: string
): Promise<ActiveStudentRoutine | null> {
    const { data: assignment, error } = await supabase
        .from('student_routines')
        .select('id, routine_id, program_started_on, training_weekdays')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()

    if (!error) {
        if (!assignment?.id || !assignment.routine_id) return null
        return {
            assignmentId: assignment.id,
            routineId: assignment.routine_id,
            programStartedOn: typeof assignment.program_started_on === 'string'
                ? assignment.program_started_on
                : null,
            trainingWeekdays: normalizeTrainingWeekdays(assignment.training_weekdays),
        }
    }

    // La primera actualización puede desplegarse antes que la migración. En
    // ese lapso leemos la asignación sin días, pero nunca inventamos un horario.
    if (isMissingColumn(error, 'training_weekdays')) {
        const { data: assignmentWithoutWeekdays, error: assignmentWithoutWeekdaysError } = await supabase
            .from('student_routines')
            .select('id, routine_id, program_started_on')
            .eq('student_id', studentId)
            .eq('status', 'active')
            .maybeSingle()

        if (!assignmentWithoutWeekdaysError) {
            if (!assignmentWithoutWeekdays?.id || !assignmentWithoutWeekdays.routine_id) return null
            return {
                assignmentId: assignmentWithoutWeekdays.id,
                routineId: assignmentWithoutWeekdays.routine_id,
                programStartedOn: typeof assignmentWithoutWeekdays.program_started_on === 'string'
                    ? assignmentWithoutWeekdays.program_started_on
                    : null,
                trainingWeekdays: null,
            }
        }

        if (!isMissingColumn(assignmentWithoutWeekdaysError, 'program_started_on')) {
            throw assignmentWithoutWeekdaysError
        }
    } else if (!isMissingColumn(error, 'program_started_on')) {
        // Un error de red, permisos o duplicados no debe convertirse en “sin rutina”.
        throw error
    }

    const { data: legacyAssignment, error: legacyError } = await supabase
        .from('student_routines')
        .select('id, routine_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()

    if (legacyError) throw legacyError

    if (!legacyAssignment?.id || !legacyAssignment.routine_id) return null

    return {
        assignmentId: legacyAssignment.id,
        routineId: legacyAssignment.routine_id,
        programStartedOn: null,
        trainingWeekdays: null,
    }
}
