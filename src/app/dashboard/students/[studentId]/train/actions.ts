'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveWorkoutSession(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const studentId = String(formData.get('student_id') ?? '')
    const selectedDayId = String(formData.get('selected_day_id') ?? '')
    const performedAt = String(formData.get('performed_at') ?? '')

    if (!studentId || !selectedDayId || !performedAt) {
        redirect(
            `/dashboard/students/${studentId}/train?day=${selectedDayId}&error=empty`
        )
    }

    const { data: dayExercises, error: dayExercisesError } = await supabase
        .from('routine_day_exercises')
        .select('id, sets')
        .eq('routine_day_id', selectedDayId)
        .order('id', { ascending: true })

    if (dayExercisesError || !dayExercises) {
        redirect(
            `/dashboard/students/${studentId}/train?day=${selectedDayId}&error=empty`
        )
    }

    const rows: Array<{
        student_id: string
        routine_day_exercise_id: string
        weight: number | null
        reps: number | null
        performed_at: string
        set_index: number
    }> = []

    for (const exercise of dayExercises) {
        const setsCount = Math.max(1, Number(exercise.sets ?? 1))

        for (let setIndex = 0; setIndex < setsCount; setIndex++) {
            const weightRaw = formData.get(`weight_${exercise.id}_${setIndex}`)
            const repsRaw = formData.get(`reps_${exercise.id}_${setIndex}`)

            const weightValue =
                weightRaw !== null && String(weightRaw).trim() !== ''
                    ? Number(weightRaw)
                    : null

            const repsValue =
                repsRaw !== null && String(repsRaw).trim() !== ''
                    ? Number(repsRaw)
                    : null

            if (
                (weightValue !== null && Number.isNaN(weightValue)) ||
                (repsValue !== null && Number.isNaN(repsValue))
            ) {
                continue
            }

            if (weightValue === null && repsValue === null) {
                continue
            }

            rows.push({
                student_id: studentId,
                routine_day_exercise_id: exercise.id,
                weight: weightValue,
                reps: repsValue,
                performed_at: performedAt,
                set_index: setIndex,
            })
        }
    }

    if (rows.length === 0) {
        redirect(
            `/dashboard/students/${studentId}/train?day=${selectedDayId}&error=empty`
        )
    }

    const { error: insertError } = await supabase
        .from('exercise_logs')
        .insert(rows)

    if (insertError) {
        console.error('Error guardando entrenamiento:', insertError)
        redirect(
            `/dashboard/students/${studentId}/train?day=${selectedDayId}&error=empty`
        )
    }

    redirect(`/dashboard/students/${studentId}/train?day=${selectedDayId}&saved=1`)
}