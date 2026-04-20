'use server'

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

    const alerts: StudentAlert[] = []

    for (const student of students) {
        const risk = await getStudentRisk(student.id)

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