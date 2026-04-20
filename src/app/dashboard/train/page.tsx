import { createClient } from '@/lib/supabase/server'
import TrainSelectorClient from './TrainSelectorClient'
import { getStudentRisk } from '../students/[studentId]/getStudentRisk'

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

export default async function TrainSelectorPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

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

    // -------------------------
    // 2. rutinas
    // -------------------------
    const { data: routines } = studentIds.length
        ? await supabase
            .from('routines')
            .select('id, student_id, name, days_per_week')
            .in('student_id', studentIds)
        : { data: [] as any[] }

    const routineMap = new Map(
        (routines ?? []).map((r) => [r.student_id, r])
    )

    // -------------------------
    // 3. último entrenamiento
    // -------------------------
    const { data: logs } = studentIds.length
        ? await supabase
            .from('exercise_logs')
            .select('student_id, performed_at')
            .in('student_id', studentIds)
            .order('performed_at', { ascending: false })
        : { data: [] as any[] }

    const lastWorkoutMap = new Map<string, string>()

    for (const log of logs ?? []) {
        if (!lastWorkoutMap.has(log.student_id)) {
            lastWorkoutMap.set(log.student_id, log.performed_at)
        }
    }

    // -------------------------
    // 4. riesgo real
    // -------------------------
    const riskResults = await Promise.all(
        (students ?? []).map(async (student) => {
            const risk = await getStudentRisk(student.id)

            const riskLevel: 'low' | 'medium' | 'high' =
                risk?.level === 'high'
                    ? 'high'
                    : risk?.level === 'medium'
                        ? 'medium'
                        : 'low'

            return {
                studentId: student.id,
                riskLevel,
            }
        })
    )

    const riskMap = new Map(
        riskResults.map((r) => [r.studentId, r.riskLevel])
    )

    // -------------------------
    // 5. merge final
    // -------------------------
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
                riskLevel: riskMap.get(student.id) ?? 'low',
            }
        }
    )

    return <TrainSelectorClient students={enrichedStudents} />
}