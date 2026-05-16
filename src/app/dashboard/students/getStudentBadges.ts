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
    const { data: rawLogs } = await supabase
        .from('exercise_logs')
        .select('routine_day_exercise_id')
        .eq('student_id', studentId)
    const uniqueRDEs = new Set((rawLogs ?? []).map(l => l.routine_day_exercise_id)).size

    // Variables adicionales necesarias
    const sessionsWithRPE = sessions.filter(s =>
        s.exercises.some(e => e.avgRpe != null && e.avgRpe > 0)
    )
    const highRPESessions = sessions.filter(s => {
        const rpes = s.exercises.map(e => e.avgRpe).filter((r): r is number => r !== null)
        if (rpes.length === 0) return false
        return rpes.reduce((a, b) => a + b, 0) / rpes.length >= 8
    })
    const perfectRPESessions = sessions.filter(s => {
        const rpes = s.exercises.map(e => e.avgRpe).filter((r): r is number => r !== null)
        if (rpes.length === 0) return false
        return rpes.reduce((a, b) => a + b, 0) / rpes.length >= 9
    })

    const weekDays = sessions.map(s => new Date(s.performedDate).getDay())
    const mondaySessions = weekDays.filter(d => d === 1).length
    const fridaySessions = weekDays.filter(d => d === 5).length
    const saturdaySessions = weekDays.filter(d => d === 6).length
    const sundaySessions = weekDays.filter(d => d === 0).length
    const weekendSessions = saturdaySessions + sundaySessions

    const sessionsByMonth = new Map<string, number>()
    for (const s of sessions) {
        const key = s.performedDate.slice(0, 7)
        sessionsByMonth.set(key, (sessionsByMonth.get(key) ?? 0) + 1)
    }
    const bestMonth = Math.max(0, ...Array.from(sessionsByMonth.values()))
    const activeMonths = sessionsByMonth.size
    const monthsWith4Plus = Array.from(sessionsByMonth.values()).filter(v => v >= 4).length
    const monthsWith8Plus = Array.from(sessionsByMonth.values()).filter(v => v >= 8).length
    const monthsWith12Plus = Array.from(sessionsByMonth.values()).filter(v => v >= 12).length

    const weeks = new Set(sessions.map(s => {
        const d = new Date(s.performedDate)
        const jan1 = new Date(d.getFullYear(), 0, 1)
        return `${d.getFullYear()}-${Math.ceil((((d.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7)}`
    }))
    const activeWeeks = weeks.size

    const bigSessions = sessions.filter(s => s.totalSets >= 20)
    const smallSessions = sessions.filter(s => s.totalSets >= 5)
    const avgSetsPerSession = totalSessions > 0 ? totalSets / totalSessions : 0

    const badges: Badge[] = [
        // ── SESIONES (20) ──
        {
            id: 'primera_sesion',
            emoji: '🏁',
            title: 'Primera sesión',
            description: 'Completaste tu primer entrenamiento.',
            unlocked: totalSessions >= 1,
            progress: Math.min(100, totalSessions * 100),
            progressLabel: totalSessions < 1 ? '0 / 1 sesiones' : undefined,
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
            id: 'veinte_sesiones',
            emoji: '🎯',
            title: 'Comprometido',
            description: '20 entrenamientos completados.',
            unlocked: totalSessions >= 20,
            progress: Math.min(100, (totalSessions / 20) * 100),
            progressLabel: totalSessions < 20 ? `${totalSessions} / 20 sesiones` : undefined,
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
        {
            id: 'setenta_y_cinco_sesiones',
            emoji: '🦅',
            title: 'Incansable',
            description: '75 entrenamientos completados.',
            unlocked: totalSessions >= 75,
            progress: Math.min(100, (totalSessions / 75) * 100),
            progressLabel: totalSessions < 75 ? `${totalSessions} / 75 sesiones` : undefined,
            category: 'sesiones',
        },
        {
            id: 'cien_sesiones',
            emoji: '👑',
            title: 'Centenario',
            description: '100 entrenamientos. Leyenda.',
            unlocked: totalSessions >= 100,
            progress: Math.min(100, (totalSessions / 100) * 100),
            progressLabel: totalSessions < 100 ? `${totalSessions} / 100 sesiones` : undefined,
            category: 'sesiones',
        },
        {
            id: 'ciento_cincuenta_sesiones',
            emoji: '🔱',
            title: 'Veterano',
            description: '150 entrenamientos. Respeto total.',
            unlocked: totalSessions >= 150,
            progress: Math.min(100, (totalSessions / 150) * 100),
            progressLabel: totalSessions < 150 ? `${totalSessions} / 150 sesiones` : undefined,
            category: 'sesiones',
        },
        {
            id: 'doscientas_sesiones',
            emoji: '🌌',
            title: 'Inmortal',
            description: '200 entrenamientos. Nivel otro.',
            unlocked: totalSessions >= 200,
            progress: Math.min(100, (totalSessions / 200) * 100),
            progressLabel: totalSessions < 200 ? `${totalSessions} / 200 sesiones` : undefined,
            category: 'sesiones',
        },
        {
            id: 'mejor_mes_4',
            emoji: '📅',
            title: 'Mes activo',
            description: 'Entrenaste 4 veces en un mismo mes.',
            unlocked: bestMonth >= 4,
            progress: Math.min(100, (bestMonth / 4) * 100),
            progressLabel: bestMonth < 4 ? `${bestMonth} / 4 sesiones en un mes` : undefined,
            category: 'sesiones',
        },
        {
            id: 'mejor_mes_8',
            emoji: '🗓️',
            title: 'Mes intenso',
            description: 'Entrenaste 8 veces en un mismo mes.',
            unlocked: bestMonth >= 8,
            progress: Math.min(100, (bestMonth / 8) * 100),
            progressLabel: bestMonth < 8 ? `${bestMonth} / 8 sesiones en un mes` : undefined,
            category: 'sesiones',
        },
        {
            id: 'mejor_mes_12',
            emoji: '🌊',
            title: 'Mes brutal',
            description: 'Entrenaste 12 veces en un mismo mes.',
            unlocked: bestMonth >= 12,
            progress: Math.min(100, (bestMonth / 12) * 100),
            progressLabel: bestMonth < 12 ? `${bestMonth} / 12 sesiones en un mes` : undefined,
            category: 'sesiones',
        },
        {
            id: 'tres_meses_activos',
            emoji: '📆',
            title: '3 meses activo',
            description: 'Entrenaste durante 3 meses distintos.',
            unlocked: activeMonths >= 3,
            progress: Math.min(100, (activeMonths / 3) * 100),
            progressLabel: activeMonths < 3 ? `${activeMonths} / 3 meses` : undefined,
            category: 'sesiones',
        },
        {
            id: 'seis_meses_activos',
            emoji: '🏅',
            title: '6 meses activo',
            description: 'Entrenaste durante 6 meses distintos.',
            unlocked: activeMonths >= 6,
            progress: Math.min(100, (activeMonths / 6) * 100),
            progressLabel: activeMonths < 6 ? `${activeMonths} / 6 meses` : undefined,
            category: 'sesiones',
        },
        {
            id: 'doce_meses_activos',
            emoji: '🎖️',
            title: 'Un año entero',
            description: 'Entrenaste durante 12 meses distintos.',
            unlocked: activeMonths >= 12,
            progress: Math.min(100, (activeMonths / 12) * 100),
            progressLabel: activeMonths < 12 ? `${activeMonths} / 12 meses` : undefined,
            category: 'sesiones',
        },
        {
            id: 'lunes_x10',
            emoji: '😤',
            title: 'Lunes warrior',
            description: 'Entrenaste 10 lunes.',
            unlocked: mondaySessions >= 10,
            progress: Math.min(100, (mondaySessions / 10) * 100),
            progressLabel: mondaySessions < 10 ? `${mondaySessions} / 10 lunes` : undefined,
            category: 'sesiones',
        },
        {
            id: 'viernes_x10',
            emoji: '🎉',
            title: 'Viernes de hierro',
            description: 'Entrenaste 10 viernes.',
            unlocked: fridaySessions >= 10,
            progress: Math.min(100, (fridaySessions / 10) * 100),
            progressLabel: fridaySessions < 10 ? `${fridaySessions} / 10 viernes` : undefined,
            category: 'sesiones',
        },
        {
            id: 'finde_x5',
            emoji: '🏖️',
            title: 'Sin descanso',
            description: 'Entrenaste 5 veces el fin de semana.',
            unlocked: weekendSessions >= 5,
            progress: Math.min(100, (weekendSessions / 5) * 100),
            progressLabel: weekendSessions < 5 ? `${weekendSessions} / 5 fines de semana` : undefined,
            category: 'sesiones',
        },
        {
            id: 'domingo_x5',
            emoji: '☀️',
            title: 'Domingo de campeones',
            description: 'Entrenaste 5 domingos.',
            unlocked: sundaySessions >= 5,
            progress: Math.min(100, (sundaySessions / 5) * 100),
            progressLabel: sundaySessions < 5 ? `${sundaySessions} / 5 domingos` : undefined,
            category: 'sesiones',
        },

        // ── CONSTANCIA (15) ──
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
        {
            id: 'racha_14',
            emoji: '🔐',
            title: 'Dos semanas',
            description: '14 días consecutivos entrenando.',
            unlocked: maxStreak >= 14,
            progress: Math.min(100, (maxStreak / 14) * 100),
            progressLabel: maxStreak < 14 ? `${maxStreak} / 14 días` : undefined,
            category: 'constancia',
        },
        {
            id: 'racha_21',
            emoji: '🧱',
            title: '21 días',
            description: 'El hábito ya está formado.',
            unlocked: maxStreak >= 21,
            progress: Math.min(100, (maxStreak / 21) * 100),
            progressLabel: maxStreak < 21 ? `${maxStreak} / 21 días` : undefined,
            category: 'constancia',
        },
        {
            id: 'racha_30',
            emoji: '🗓️',
            title: 'Mes completo',
            description: '30 días seguidos. Imparable.',
            unlocked: maxStreak >= 30,
            progress: Math.min(100, (maxStreak / 30) * 100),
            progressLabel: maxStreak < 30 ? `${maxStreak} / 30 días` : undefined,
            category: 'constancia',
        },
        {
            id: 'racha_60',
            emoji: '🌋',
            title: '2 meses seguidos',
            description: '60 días consecutivos. Fenomenal.',
            unlocked: maxStreak >= 60,
            progress: Math.min(100, (maxStreak / 60) * 100),
            progressLabel: maxStreak < 60 ? `${maxStreak} / 60 días` : undefined,
            category: 'constancia',
        },
        {
            id: 'racha_100',
            emoji: '🔥👑',
            title: '100 días seguidos',
            description: 'Sos un fenómeno.',
            unlocked: maxStreak >= 100,
            progress: Math.min(100, (maxStreak / 100) * 100),
            progressLabel: maxStreak < 100 ? `${maxStreak} / 100 días` : undefined,
            category: 'constancia',
        },
        {
            id: 'cinco_semanas_activas',
            emoji: '📊',
            title: '5 semanas activo',
            description: 'Entrenaste al menos una vez por semana durante 5 semanas.',
            unlocked: activeWeeks >= 5,
            progress: Math.min(100, (activeWeeks / 5) * 100),
            progressLabel: activeWeeks < 5 ? `${activeWeeks} / 5 semanas` : undefined,
            category: 'constancia',
        },
        {
            id: 'diez_semanas_activas',
            emoji: '📈',
            title: '10 semanas activo',
            description: 'Entrenaste durante 10 semanas distintas.',
            unlocked: activeWeeks >= 10,
            progress: Math.min(100, (activeWeeks / 10) * 100),
            progressLabel: activeWeeks < 10 ? `${activeWeeks} / 10 semanas` : undefined,
            category: 'constancia',
        },
        {
            id: 'veinte_semanas_activas',
            emoji: '🏗️',
            title: '20 semanas activo',
            description: '20 semanas entrenando. Base sólida.',
            unlocked: activeWeeks >= 20,
            progress: Math.min(100, (activeWeeks / 20) * 100),
            progressLabel: activeWeeks < 20 ? `${activeWeeks} / 20 semanas` : undefined,
            category: 'constancia',
        },
        {
            id: 'meses_4_con_sesiones',
            emoji: '💎',
            title: 'Base de hierro',
            description: 'Entrenaste 4+ veces en 4 meses distintos.',
            unlocked: monthsWith4Plus >= 4,
            progress: Math.min(100, (monthsWith4Plus / 4) * 100),
            progressLabel: monthsWith4Plus < 4 ? `${monthsWith4Plus} / 4 meses` : undefined,
            category: 'constancia',
        },
        {
            id: 'meses_8_con_sesiones',
            emoji: '🏰',
            title: 'Consistencia total',
            description: 'Entrenaste 8+ veces en 3 meses distintos.',
            unlocked: monthsWith8Plus >= 3,
            progress: Math.min(100, (monthsWith8Plus / 3) * 100),
            progressLabel: monthsWith8Plus < 3 ? `${monthsWith8Plus} / 3 meses` : undefined,
            category: 'constancia',
        },
        {
            id: 'meses_12_con_sesiones',
            emoji: '⚔️',
            title: 'Guerrero del mes',
            description: 'Entrenaste 12+ veces en un mes.',
            unlocked: monthsWith12Plus >= 1,
            progress: monthsWith12Plus >= 1 ? 100 : Math.min(100, (bestMonth / 12) * 100),
            progressLabel: monthsWith12Plus < 1 ? `Mejor mes: ${bestMonth} / 12 sesiones` : undefined,
            category: 'constancia',
        },
        {
            id: 'sin_fallar_semana',
            emoji: '🎗️',
            title: 'Sin fallas',
            description: 'Nunca faltaste una semana completa.',
            unlocked: activeWeeks >= 4 && activeWeeks >= Math.floor(totalSessions / 2),
            progress: activeWeeks >= 4 ? 100 : Math.min(100, (activeWeeks / 4) * 100),
            category: 'constancia',
        },
        {
            id: 'madrugador',
            emoji: '🌅',
            title: 'Madrugador',
            description: 'Registraste una sesión antes de las 8am.',
            unlocked: sessions.some(s => new Date(s.performedDate).getHours() < 8),
            progress: sessions.some(s => new Date(s.performedDate).getHours() < 8) ? 100 : 0,
            category: 'constancia',
        },

        // ── PROGRESO (25) ──
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
            id: 'progreso_2kg',
            emoji: '📊',
            title: '+2kg',
            description: 'Acumulaste 2kg de mejora total.',
            unlocked: totalProgressKg >= 2,
            progress: Math.min(100, (totalProgressKg / 2) * 100),
            progressLabel: totalProgressKg < 2 ? `${totalProgressKg.toFixed(1)} / 2 kg` : undefined,
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
            id: 'progreso_10kg',
            emoji: '💹',
            title: '+10kg de progreso',
            description: 'Acumulaste 10kg de mejora total.',
            unlocked: totalProgressKg >= 10,
            progress: Math.min(100, (totalProgressKg / 10) * 100),
            progressLabel: totalProgressKg < 10 ? `${totalProgressKg.toFixed(1)} / 10 kg` : undefined,
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
            id: 'progreso_50kg',
            emoji: '🏋️',
            title: '+50kg de progreso',
            description: 'Acumulaste 50kg de mejora total.',
            unlocked: totalProgressKg >= 50,
            progress: Math.min(100, (totalProgressKg / 50) * 100),
            progressLabel: totalProgressKg < 50 ? `${totalProgressKg.toFixed(1)} / 50 kg` : undefined,
            category: 'progreso',
        },
        {
            id: 'progreso_100kg',
            emoji: '🌠',
            title: '+100kg de progreso',
            description: '100kg de mejora acumulada. Extraordinario.',
            unlocked: totalProgressKg >= 100,
            progress: Math.min(100, (totalProgressKg / 100) * 100),
            progressLabel: totalProgressKg < 100 ? `${totalProgressKg.toFixed(1)} / 100 kg` : undefined,
            category: 'progreso',
        },
        {
            id: 'progreso_200kg',
            emoji: '🌍',
            title: '+200kg de progreso',
            description: 'Progreso total de 200kg. Monstruo.',
            unlocked: totalProgressKg >= 200,
            progress: Math.min(100, (totalProgressKg / 200) * 100),
            progressLabel: totalProgressKg < 200 ? `${totalProgressKg.toFixed(1)} / 200 kg` : undefined,
            category: 'progreso',
        },
        {
            id: 'mejor_progreso_10kg',
            emoji: '🥇',
            title: '+10kg en un ejercicio',
            description: 'Mejoraste 10kg en un mismo ejercicio.',
            unlocked: bestProgressKg >= 10,
            progress: Math.min(100, (bestProgressKg / 10) * 100),
            progressLabel: bestProgressKg < 10 ? `${bestProgressKg.toFixed(1)} / 10 kg` : undefined,
            category: 'progreso',
        },
        {
            id: 'mejor_progreso_25kg',
            emoji: '🥈',
            title: '+25kg en un ejercicio',
            description: 'Mejoraste 25kg en un mismo ejercicio.',
            unlocked: bestProgressKg >= 25,
            progress: Math.min(100, (bestProgressKg / 25) * 100),
            progressLabel: bestProgressKg < 25 ? `${bestProgressKg.toFixed(1)} / 25 kg` : undefined,
            category: 'progreso',
        },
        {
            id: 'mejor_progreso_50kg',
            emoji: '🥉',
            title: '+50kg en un ejercicio',
            description: 'Mejoraste 50kg en un solo ejercicio.',
            unlocked: bestProgressKg >= 50,
            progress: Math.min(100, (bestProgressKg / 50) * 100),
            progressLabel: bestProgressKg < 50 ? `${bestProgressKg.toFixed(1)} / 50 kg` : undefined,
            category: 'progreso',
        },
        {
            id: 'un_ejercicio_con_progreso',
            emoji: '🌱',
            title: 'Primera mejora',
            description: 'Progresaste en tu primer ejercicio.',
            unlocked: exercisesWithProgress >= 1,
            progress: exercisesWithProgress >= 1 ? 100 : 0,
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
        {
            id: 'cinco_ejercicios',
            emoji: '🎯',
            title: 'Atleta completo',
            description: 'Progresaste en 5 ejercicios distintos.',
            unlocked: exercisesWithProgress >= 5,
            progress: Math.min(100, (exercisesWithProgress / 5) * 100),
            progressLabel: exercisesWithProgress < 5 ? `${exercisesWithProgress} / 5 ejercicios` : undefined,
            category: 'progreso',
        },
        {
            id: 'diez_ejercicios',
            emoji: '🌈',
            title: 'Polivalente',
            description: 'Progresaste en 10 ejercicios distintos.',
            unlocked: exercisesWithProgress >= 10,
            progress: Math.min(100, (exercisesWithProgress / 10) * 100),
            progressLabel: exercisesWithProgress < 10 ? `${exercisesWithProgress} / 10 ejercicios` : undefined,
            category: 'progreso',
        },
        {
            id: 'quince_ejercicios',
            emoji: '🔮',
            title: 'Maestro del progreso',
            description: 'Progresaste en 15 ejercicios distintos.',
            unlocked: exercisesWithProgress >= 15,
            progress: Math.min(100, (exercisesWithProgress / 15) * 100),
            progressLabel: exercisesWithProgress < 15 ? `${exercisesWithProgress} / 15 ejercicios` : undefined,
            category: 'progreso',
        },
        {
            id: 'veinte_ejercicios_progreso',
            emoji: '🌟',
            title: 'Leyenda del hierro',
            description: 'Progresaste en 20 ejercicios distintos.',
            unlocked: exercisesWithProgress >= 20,
            progress: Math.min(100, (exercisesWithProgress / 20) * 100),
            progressLabel: exercisesWithProgress < 20 ? `${exercisesWithProgress} / 20 ejercicios` : undefined,
            category: 'progreso',
        },
        {
            id: 'explorador_10',
            emoji: '🧩',
            title: 'Explorador',
            description: 'Entrenaste 10 ejercicios diferentes.',
            unlocked: uniqueRDEs >= 10,
            progress: Math.min(100, (uniqueRDEs / 10) * 100),
            progressLabel: uniqueRDEs < 10 ? `${uniqueRDEs} / 10 ejercicios` : undefined,
            category: 'progreso',
        },
        {
            id: 'explorador_20',
            emoji: '🗺️',
            title: 'Gran explorador',
            description: 'Entrenaste 20 ejercicios diferentes.',
            unlocked: uniqueRDEs >= 20,
            progress: Math.min(100, (uniqueRDEs / 20) * 100),
            progressLabel: uniqueRDEs < 20 ? `${uniqueRDEs} / 20 ejercicios` : undefined,
            category: 'progreso',
        },
        {
            id: 'explorador_30',
            emoji: '🌐',
            title: 'Sin límites',
            description: 'Entrenaste 30 ejercicios diferentes.',
            unlocked: uniqueRDEs >= 30,
            progress: Math.min(100, (uniqueRDEs / 30) * 100),
            progressLabel: uniqueRDEs < 30 ? `${uniqueRDEs} / 30 ejercicios` : undefined,
            category: 'progreso',
        },
        {
            id: 'rpe_alto_x5',
            emoji: '😤',
            title: 'Intensidad alta',
            description: '5 sesiones con RPE promedio ≥ 8.',
            unlocked: highRPESessions.length >= 5,
            progress: Math.min(100, (highRPESessions.length / 5) * 100),
            progressLabel: highRPESessions.length < 5 ? `${highRPESessions.length} / 5 sesiones` : undefined,
            category: 'progreso',
        },
        {
            id: 'rpe_alto_x20',
            emoji: '🫀',
            title: 'Al límite',
            description: '20 sesiones con RPE promedio ≥ 8.',
            unlocked: highRPESessions.length >= 20,
            progress: Math.min(100, (highRPESessions.length / 20) * 100),
            progressLabel: highRPESessions.length < 20 ? `${highRPESessions.length} / 20 sesiones` : undefined,
            category: 'progreso',
        },
        {
            id: 'rpe_perfecto_x3',
            emoji: '🔴',
            title: 'Todo o nada',
            description: '3 sesiones con RPE ≥ 9.',
            unlocked: perfectRPESessions.length >= 3,
            progress: Math.min(100, (perfectRPESessions.length / 3) * 100),
            progressLabel: perfectRPESessions.length < 3 ? `${perfectRPESessions.length} / 3 sesiones` : undefined,
            category: 'progreso',
        },
        {
            id: 'rpe_registrado_x10',
            emoji: '📝',
            title: 'Analítico',
            description: 'Registraste RPE en 10 sesiones.',
            unlocked: sessionsWithRPE.length >= 10,
            progress: Math.min(100, (sessionsWithRPE.length / 10) * 100),
            progressLabel: sessionsWithRPE.length < 10 ? `${sessionsWithRPE.length} / 10 sesiones` : undefined,
            category: 'progreso',
        },
        {
            id: 'rpe_registrado_x30',
            emoji: '🔬',
            title: 'Científico del gym',
            description: 'Registraste RPE en 30 sesiones.',
            unlocked: sessionsWithRPE.length >= 30,
            progress: Math.min(100, (sessionsWithRPE.length / 30) * 100),
            progressLabel: sessionsWithRPE.length < 30 ? `${sessionsWithRPE.length} / 30 sesiones` : undefined,
            category: 'progreso',
        },

        // ── FUERZA (20) ──
        {
            id: 'diez_series',
            emoji: '🌿',
            title: 'Arrancando',
            description: 'Completaste 10 series en total.',
            unlocked: totalSets >= 10,
            progress: Math.min(100, (totalSets / 10) * 100),
            progressLabel: totalSets < 10 ? `${totalSets} / 10 series` : undefined,
            category: 'fuerza',
        },
        {
            id: 'cincuenta_series',
            emoji: '💦',
            title: 'Calentando motores',
            description: 'Completaste 50 series en total.',
            unlocked: totalSets >= 50,
            progress: Math.min(100, (totalSets / 50) * 100),
            progressLabel: totalSets < 50 ? `${totalSets} / 50 series` : undefined,
            category: 'fuerza',
        },
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
            id: 'doscientas_series',
            emoji: '⚡',
            title: '200 series',
            description: '200 series completadas.',
            unlocked: totalSets >= 200,
            progress: Math.min(100, (totalSets / 200) * 100),
            progressLabel: totalSets < 200 ? `${totalSets} / 200 series` : undefined,
            category: 'fuerza',
        },
        {
            id: 'trescientas_series',
            emoji: '🔋',
            title: '300 series',
            description: '300 series. La energía no se acaba.',
            unlocked: totalSets >= 300,
            progress: Math.min(100, (totalSets / 300) * 100),
            progressLabel: totalSets < 300 ? `${totalSets} / 300 series` : undefined,
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
        {
            id: 'setecientas_series',
            emoji: '🤖',
            title: '700 series',
            description: '700 series. Máquina de entrenamiento.',
            unlocked: totalSets >= 700,
            progress: Math.min(100, (totalSets / 700) * 100),
            progressLabel: totalSets < 700 ? `${totalSets} / 700 series` : undefined,
            category: 'fuerza',
        },
        {
            id: 'mil_series',
            emoji: '⚙️',
            title: '1000 series',
            description: '1000 series completadas. Élite total.',
            unlocked: totalSets >= 1000,
            progress: Math.min(100, (totalSets / 1000) * 100),
            progressLabel: totalSets < 1000 ? `${totalSets} / 1000 series` : undefined,
            category: 'fuerza',
        },
        {
            id: 'dos_mil_series',
            emoji: '🌋',
            title: '2000 series',
            description: '2000 series. Sos una fuerza de la naturaleza.',
            unlocked: totalSets >= 2000,
            progress: Math.min(100, (totalSets / 2000) * 100),
            progressLabel: totalSets < 2000 ? `${totalSets} / 2000 series` : undefined,
            category: 'fuerza',
        },
        {
            id: 'sesion_grande_x1',
            emoji: '💥',
            title: 'Sesión épica',
            description: 'Completaste una sesión con 20+ series.',
            unlocked: bigSessions.length >= 1,
            progress: bigSessions.length >= 1 ? 100 : 0,
            category: 'fuerza',
        },
        {
            id: 'sesion_grande_x5',
            emoji: '🎆',
            title: '5 sesiones épicas',
            description: '5 sesiones con 20+ series cada una.',
            unlocked: bigSessions.length >= 5,
            progress: Math.min(100, (bigSessions.length / 5) * 100),
            progressLabel: bigSessions.length < 5 ? `${bigSessions.length} / 5 sesiones` : undefined,
            category: 'fuerza',
        },
        {
            id: 'sesion_grande_x10',
            emoji: '🎇',
            title: '10 sesiones épicas',
            description: '10 sesiones con 20+ series cada una.',
            unlocked: bigSessions.length >= 10,
            progress: Math.min(100, (bigSessions.length / 10) * 100),
            progressLabel: bigSessions.length < 10 ? `${bigSessions.length} / 10 sesiones` : undefined,
            category: 'fuerza',
        },
        {
            id: 'promedio_sets_alto',
            emoji: '📐',
            title: 'Volumen sostenido',
            description: 'Promedio de 15+ series por sesión.',
            unlocked: avgSetsPerSession >= 15,
            progress: Math.min(100, (avgSetsPerSession / 15) * 100),
            progressLabel: avgSetsPerSession < 15 ? `Promedio: ${avgSetsPerSession.toFixed(1)} / 15 series` : undefined,
            category: 'fuerza',
        },
        {
            id: 'promedio_sets_muy_alto',
            emoji: '🏗️',
            title: 'Volumen brutal',
            description: 'Promedio de 20+ series por sesión.',
            unlocked: avgSetsPerSession >= 20,
            progress: Math.min(100, (avgSetsPerSession / 20) * 100),
            progressLabel: avgSetsPerSession < 20 ? `Promedio: ${avgSetsPerSession.toFixed(1)} / 20 series` : undefined,
            category: 'fuerza',
        },
        {
            id: 'cincuenta_sesiones_con_sets',
            emoji: '🧲',
            title: 'Siempre presente',
            description: '50 sesiones con al menos 5 series.',
            unlocked: smallSessions.length >= 50,
            progress: Math.min(100, (smallSessions.length / 50) * 100),
            progressLabel: smallSessions.length < 50 ? `${smallSessions.length} / 50 sesiones` : undefined,
            category: 'fuerza',
        },
        {
            id: 'tres_ejercicios_unicos',
            emoji: '🎲',
            title: 'Variado',
            description: 'Entrenaste al menos 3 ejercicios distintos.',
            unlocked: uniqueRDEs >= 3,
            progress: Math.min(100, (uniqueRDEs / 3) * 100),
            progressLabel: uniqueRDEs < 3 ? `${uniqueRDEs} / 3 ejercicios` : undefined,
            category: 'fuerza',
        },
        {
            id: 'cinco_ejercicios_unicos',
            emoji: '🎰',
            title: 'Arsenal',
            description: 'Entrenaste al menos 5 ejercicios distintos.',
            unlocked: uniqueRDEs >= 5,
            progress: Math.min(100, (uniqueRDEs / 5) * 100),
            progressLabel: uniqueRDEs < 5 ? `${uniqueRDEs} / 5 ejercicios` : undefined,
            category: 'fuerza',
        },
        {
            id: 'quince_ejercicios_unicos',
            emoji: '🏹',
            title: 'Arsenal completo',
            description: 'Entrenaste al menos 15 ejercicios distintos.',
            unlocked: uniqueRDEs >= 15,
            progress: Math.min(100, (uniqueRDEs / 15) * 100),
            progressLabel: uniqueRDEs < 15 ? `${uniqueRDEs} / 15 ejercicios` : undefined,
            category: 'fuerza',
        },
        {
            id: 'veinticinco_ejercicios_unicos',
            emoji: '🗡️',
            title: 'Guerrero completo',
            description: 'Entrenaste al menos 25 ejercicios distintos.',
            unlocked: uniqueRDEs >= 25,
            progress: Math.min(100, (uniqueRDEs / 25) * 100),
            progressLabel: uniqueRDEs < 25 ? `${uniqueRDEs} / 25 ejercicios` : undefined,
            category: 'fuerza',
        },
        {
            id: 'cincuenta_ejercicios_unicos',
            emoji: '⚜️',
            title: 'Maestro absoluto',
            description: 'Entrenaste al menos 50 ejercicios distintos.',
            unlocked: uniqueRDEs >= 50,
            progress: Math.min(100, (uniqueRDEs / 50) * 100),
            progressLabel: uniqueRDEs < 50 ? `${uniqueRDEs} / 50 ejercicios` : undefined,
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