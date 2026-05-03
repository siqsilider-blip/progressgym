import { createClient } from '@/lib/supabase/server'
import { getStudentExerciseProgress } from '@/app/dashboard/students/getStudentExerciseProgress'
import { getStudentSessionHistory } from '@/app/dashboard/students/getStudentSessionHistory'

export type Badge = {
    id: string
    emoji: string
    title: string
    description: string
    unlocked: boolean
    progress?: number      // 0-100 para mostrar barra
    progressLabel?: string // "3 / 10 sesiones"
    category: 'sesiones' | 'progreso' | 'constancia' | 'fuerza'
}

export async function getStudentBadges(studentId: string): Promise<Badge[]> {
    const supabase = await createClient()

    const [progressData, sessions] = await Promise.all([
        getStudentExerciseProgress(studentId),
        getStudentSessionHistory(studentId, 100),
    ])

    const totalSessions = sessions.length
    const totalSets = sessions.reduce((acc, s) => acc + s.totalSets, 0)
    const totalProgressKg = progressData.reduce((acc, e) => acc + e.progressKg, 0)
    const bestProgressKg = progressData[0]?.progressKg ?? 0
    const exercisesWithProgress = progressData.length

    // Racha actual
    const today = new Date()
    let streak = 0
    const sessionDates = new Set(sessions.map(s => s.performedDate))
    for (let i = 0; i < 60; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        if (sessionDates.has(dateStr)) {
            streak++
        } else if (i > 0) {
            break
        }
    }

    // Racha máxima histórica
    const sortedDates = [...sessionDates].sort()
    let maxStreak = 0
    let currentStreak = 0
    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            currentStreak = 1
        } else {
            const prev = new Date(sortedDates[i - 1])
            const curr = new Date(sortedDates[i])
            const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays === 1) {
                currentStreak++
            } else {
                currentStreak = 1
            }
        }
        maxStreak = Math.max(maxStreak, currentStreak)
    }

    // Ejercicios únicos entrenados
    const { data: uniqueExerciseLogs } = await supabase
        .from('exercise_logs')
        .select('routine_day_exercise_id')
        .eq('student_id', studentId)
    const uniqueRDEs = new Set((uniqueExerciseLogs ?? []).map(l => l.routine_day_exercise_id)).size

    const badges: Badge[] = [
        // ── SESIONES ──
        {
            id: 'primera_sesion',
            emoji: '🏁',
            title: 'Primera sesión',
            description: 'Completaste tu primer entrenamiento.',
            unlocked: totalSessions >= 1,
            progress: Math.min(100, totalSessions * 100),
            progressLabel: totalSessions >= 1 ? undefined : '0 / 1 sesiones',
            category: 'sesiones',
        },
        {
            id: 'cinco_sesiones',
            emoji: '🔥',
            title: 'En llamas',
            description: 'Completaste 5 entrenamientos.',
            unlocked: totalSessions >= 5,
            progress: Math.min(100, (totalSessions / 5) * 100),
            progressLabel: totalSessions < 5 ? `${totalSessions} / 5 sesiones` : undefined,
            category: 'sesiones',
        },
        {
            id: 'diez_sesiones',
            emoji: '💪',
            title: 'Constante',
            description: 'Completaste 10 entrenamientos.',
            unlocked: totalSessions >= 10,
            progress: Math.min(100, (totalSessions / 10) * 100),
            progressLabel: totalSessions < 10 ? `${totalSessions} / 10 sesiones` : undefined,
            category: 'sesiones',
        },
        {
            id: 'veinticinco_sesiones',
            emoji: '🏆',
            title: 'Atleta',
            description: '25 entrenamientos completados.',
            unlocked: totalSessions >= 25,
            progress: Math.min(100, (totalSessions / 25) * 100),
            progressLabel: totalSessions < 25 ? `${totalSessions} / 25 sesiones` : undefined,
            category: 'sesiones',
        },
        {
            id: 'cincuenta_sesiones',
            emoji: '🌟',
            title: 'Élite',
            description: '50 entrenamientos. Sos una máquina.',
            unlocked: totalSessions >= 50,
            progress: Math.min(100, (totalSessions / 50) * 100),
            progressLabel: totalSessions < 50 ? `${totalSessions} / 50 sesiones` : undefined,
            category: 'sesiones',
        },

        // ── CONSTANCIA ──
        {
            id: 'racha_3',
            emoji: '📅',
            title: '3 días seguidos',
            description: 'Entrenaste 3 días consecutivos.',
            unlocked: maxStreak >= 3,
            progress: Math.min(100, (maxStreak / 3) * 100),
            progressLabel: maxStreak < 3 ? `${maxStreak} / 3 días` : undefined,
            category: 'constancia',
        },
        {
            id: 'racha_7',
            emoji: '⚡',
            title: 'Semana perfecta',
            description: '7 días seguidos entrenando.',
            unlocked: maxStreak >= 7,
            progress: Math.min(100, (maxStreak / 7) * 100),
            progressLabel: maxStreak < 7 ? `${maxStreak} / 7 días` : undefined,
            category: 'constancia',
        },

        // ── PROGRESO ──
        {
            id: 'primer_pr',
            emoji: '🎯',
            title: 'Primer PR',
            description: 'Mejoraste por primera vez en un ejercicio.',
            unlocked: bestProgressKg > 0,
            progress: bestProgressKg > 0 ? 100 : 0,
            progressLabel: bestProgressKg === 0 ? 'Superá tu mejor marca' : undefined,
            category: 'progreso',
        },
        {
            id: 'progreso_5kg',
            emoji: '📈',
            title: '+5kg de progreso',
            description: 'Acumulaste 5kg de mejora total.',
            unlocked: totalProgressKg >= 5,
            progress: Math.min(100, (totalProgressKg / 5) * 100),
            progressLabel: totalProgressKg < 5 ? `${totalProgressKg.toFixed(1)} / 5 kg` : undefined,
            category: 'progreso',
        },
        {
            id: 'progreso_20kg',
            emoji: '🚀',
            title: '+20kg de progreso',
            description: 'Acumulaste 20kg de mejora total.',
            unlocked: totalProgressKg >= 20,
            progress: Math.min(100, (totalProgressKg / 20) * 100),
            progressLabel: totalProgressKg < 20 ? `${totalProgressKg.toFixed(1)} / 20 kg` : undefined,
            category: 'progreso',
        },
        {
            id: 'tres_ejercicios',
            emoji: '🎪',
            title: 'Diversidad',
            description: 'Progresaste en 3 ejercicios distintos.',
            unlocked: exercisesWithProgress >= 3,
            progress: Math.min(100, (exercisesWithProgress / 3) * 100),
            progressLabel: exercisesWithProgress < 3 ? `${exercisesWithProgress} / 3 ejercicios` : undefined,
            category: 'progreso',
        },

        // ── FUERZA ──
        {
            id: 'cien_series',
            emoji: '💯',
            title: '100 series',
            description: 'Completaste 100 series en total.',
            unlocked: totalSets >= 100,
            progress: Math.min(100, (totalSets / 100) * 100),
            progressLabel: totalSets < 100 ? `${totalSets} / 100 series` : undefined,
            category: 'fuerza',
        },
        {
            id: 'quinientas_series',
            emoji: '🦾',
            title: '500 series',
            description: '500 series completadas. Brutal.',
            unlocked: totalSets >= 500,
            progress: Math.min(100, (totalSets / 500) * 100),
            progressLabel: totalSets < 500 ? `${totalSets} / 500 series` : undefined,
            category: 'fuerza',
        },
    ]

    // Ordenar: desbloqueados primero, luego por progreso descendente
    return badges.sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1
        if (!a.unlocked && b.unlocked) return 1
        return (b.progress ?? 0) - (a.progress ?? 0)
    })
}