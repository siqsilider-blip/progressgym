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
}

function isMissingProgramStartedOn(error: SupabaseErrorLike) {
    const description = [error.message, error.details, error.hint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

    return (error.code === '42703' || error.code === 'PGRST204')
        && description.includes('program_started_on')
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
        .select('id, routine_id, program_started_on')
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
        }
    }

    // El fallback solo corresponde a bases antiguas sin esta columna. Un error
    // de red, permisos o duplicados no debe convertirse en “sin rutina”.
    if (!isMissingProgramStartedOn(error)) throw error

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
    }
}
