import { createClient } from '@/lib/supabase/server'
import TrainSelectorClient from './TrainSelectorClient'
import { getStudentsRiskBatch } from '../students/[studentId]/getStudentRisk'
import { getServerUser } from '@/lib/auth/server'

type TrainStudentItem = {
    id: string
    fullName: string
    activePlan: string | null
    routineName: string | null
    daysPerWeek: number | null
    hasRoutine: boolean
    lastWorkoutAt?: string | null
    riskLevel: 'low' | 'medium' | 'high'
}

type RoutineSummary = {
    id: string
    student_id: string
    name: string | null
    days_per_week: number | null
}

type WorkoutLogSummary = {
    student_id: string
    performed_at: string
}

export default async function TrainSelectorPage() {
    const supabase = await createClient()

    const user = await getServerUser()

    if (!user) return null

    // -------------------------
    // 1. alumnos
    // -------------------------
    const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name, active_plan, created_at')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })

    const studentIds = students?.map((s) => s.id) ?? []

    // Rutinas, actividad y riesgo se resuelven en paralelo. Antes el riesgo
    // disparaba una consulta por cada alumno.
    const [routinesResult, logsResult, riskMap] = studentIds.length
        ? await Promise.all([
            supabase
                .from('routines')
                .select('id, student_id, name, days_per_week')
                .in('student_id', studentIds),
            supabase
                .from('exercise_logs')
                .select('student_id, performed_at')
                .in('student_id', studentIds)
                .order('performed_at', { ascending: false }),
            getStudentsRiskBatch(studentIds),
        ])
        : [{ data: [] }, { data: [] }, new Map()]

    const routines = (routinesResult.data ?? []) as RoutineSummary[]

    const routineMap = new Map(
        routines.map((r) => [r.student_id, r])
    )

    const logs = (logsResult.data ?? []) as WorkoutLogSummary[]

    const lastWorkoutMap = new Map<string, string>()

    for (const log of logs) {
        if (!lastWorkoutMap.has(log.student_id)) {
            lastWorkoutMap.set(log.student_id, log.performed_at)
        }
    }

    // Merge final
    const enrichedStudents: TrainStudentItem[] = (students ?? []).map(
        (student) => {
            const routine = routineMap.get(student.id)

            const fullName =
                `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
                'Alumno'

            return {
                id: student.id,
                fullName,
                activePlan: student.active_plan ?? null,
                routineName: routine?.name ?? null,
                daysPerWeek: routine?.days_per_week ?? null,
                hasRoutine: !!routine,
                lastWorkoutAt: lastWorkoutMap.get(student.id) ?? null,
                riskLevel: riskMap.get(student.id)?.level === 'high' || riskMap.get(student.id)?.level === 'critical'
                    ? 'high'
                    : riskMap.get(student.id)?.level === 'medium'
                        ? 'medium'
                        : 'low',
            }
        }
    )

    return <TrainSelectorClient students={enrichedStudents} />
}
