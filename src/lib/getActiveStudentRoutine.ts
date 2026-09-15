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
    const { data: assignment } = await supabase
        .from('student_routines')
        .select('id, routine_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()

    if (!assignment?.id || !assignment.routine_id) return null

    const { data: progression } = await supabase
        .from('student_routines')
        .select('program_started_on')
        .eq('id', assignment.id)
        .maybeSingle()

    return {
        assignmentId: assignment.id,
        routineId: assignment.routine_id,
        programStartedOn: typeof progression?.program_started_on === 'string'
            ? progression.program_started_on
            : null,
    }
}
