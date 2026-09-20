import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type ActiveStudentRoutine = {
    assignmentId: string
    routineId: string
    programStartedOn: string | null
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

    // Compatibilidad temporal con instalaciones que aún no tengan la
    // columna de progresión. Producción usa la consulta única de arriba.
    const { data: legacyAssignment } = await supabase
        .from('student_routines')
        .select('id, routine_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()

    if (!legacyAssignment?.id || !legacyAssignment.routine_id) return null

    return {
        assignmentId: legacyAssignment.id,
        routineId: legacyAssignment.routine_id,
        programStartedOn: null,
    }
}
