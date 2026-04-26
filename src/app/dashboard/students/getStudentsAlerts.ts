import { createClient } from '@/lib/supabase/server'
import { getStudentRisk } from './[studentId]/getStudentRisk'

export type StudentAlert = {
    id: string
    name: string
    level: 'critical' | 'high'
    score: number
}

export async function getStudentsAlerts(): Promise<StudentAlert[]> {
    const supabase = await createClient()

    const { data: students } = await supabase
        .from('students')
        .select('id, first_name')

    if (!students) return []

    const results = await Promise.all(
        students.map(async (student) => {
            const risk = await getStudentRisk(student.id)
            return { student, risk }
        })
    )

    const alerts: StudentAlert[] = []

    for (const { student, risk } of results) {
        if (!risk) continue
        if (risk.level === 'critical' || risk.level === 'high') {
            alerts.push({
                id: student.id,
                name: student.first_name ?? 'Alumno',
                level: risk.level,
                score: risk.score,
            })
        }
    }

    return alerts.sort((a, b) => b.score - a.score)
}