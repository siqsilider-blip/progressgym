import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
    addExerciseToRoutineDay,
    deleteExerciseFromRoutineDay,
    addExerciseLog,
} from './actions'
import ExerciseProgressChart from '../../../../components/ExerciseProgressChart'

type PageProps = {
    params: {
        routineId: string
    }
}

type RoutineDayExercise = {
    id: string
    routine_day_id: string
    exercise_name: string
    sets: string | null
    reps: string | null
    rest_seconds: number | null
    exercise_order: number | null
}

type ExerciseOption = {
    id: string
    name: string
    muscle_group: string | null
}

type ExerciseLog = {
    id: string
    student_id: string
    routine_day_exercise_id: string
    weight: number | null
    reps: number | null
    performed_at: string | null
    created_at?: string | null
}

export default async function RoutineDetailPage({ params }: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .select('id, name, trainer_id, student_id')
        .eq('id', params.routineId)
        .eq('trainer_id', user.id)
        .single()

    if (routineError || !routine) {
        return (
            <div className="p-8 text-white">
                <h1 className="text-3xl font-bold">Rutina</h1>
                <p className="mt-4 text-red-400">Rutina no encontrada.</p>
            </div>
        )
    }

    const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', routine.student_id)
        .single()

    const { data: days, error: daysError } = await supabase
        .from('routine_days')
        .select('id, day_number, title')
        .eq('routine_id', routine.id)
        .order('day_number', { ascending: true })

    const { data: exerciseOptions } = await supabase
        .from('exercises')
        .select('id, name, muscle_group')
        .order('name', { ascending: true })

    const dayIds = (days || []).map((day) => day.id)

    const exercisesByDay: Record<string, RoutineDayExercise[]> = {}

    if (dayIds.length > 0) {
        const { data: exercises } = await supabase
            .from('routine_day_exercises')
            .select(
                'id, routine_day_id, exercise_name, sets, reps, rest_seconds, exercise_order'
            )
            .in('routine_day_id', dayIds)
            .order('exercise_order', { ascending: true })

        for (const exercise of (exercises || []) as RoutineDayExercise[]) {
            if (!exercisesByDay[exercise.routine_day_id]) {
                exercisesByDay[exercise.routine_day_id] = []
            }
            exercisesByDay[exercise.routine_day_id].push(exercise)
        }
    }

    const allExerciseIds = Object.values(exercisesByDay)
        .flat()
        .map((exercise) => exercise.id)

    const logsByExercise: Record<string, ExerciseLog[]> = {}

    if (allExerciseIds.length > 0) {
        const { data: logs } = await supabase
            .from('exercise_logs')
            .select(
                'id, student_id, routine_day_exercise_id, weight, reps, performed_at, created_at'
            )
            .in('routine_day_exercise_id', allExerciseIds)
            .eq('student_id', routine.student_id)
            .order('performed_at', { ascending: false })
            .order('created_at', { ascending: false })

        for (const log of (logs || []) as ExerciseLog[]) {
            if (!logsByExercise[log.routine_day_exercise_id]) {
                logsByExercise[log.routine_day_exercise_id] = []
            }
            logsByExercise[log.routine_day_exercise_id].push(log)
        }
    }

    return (
        <div className="p-8 text-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{routine.name}</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        {student
                            ? `Alumno: ${student.first_name} ${student.last_name}`
                            : 'Alumno no encontrado'}
                    </p>
                </div>

                <Link
                    href="/dashboard/routines"
                    className="text-sm text-zinc-300 hover:text-white"
                >
                    ← Volver
                </Link>
            </div>

            {daysError ? (
                <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-400">
                    Error cargando los días de la rutina.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {(days || []).map((day) => {
                        const dayExercises = exercisesByDay[day.id] || []

                        return (
                            <div
                                key={day.id}
                                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                            >
                                <h2 className="text-lg font-semibold text-white">
                                    {day.title || `Día ${day.day_number}`}
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    Día {day.day_number}
                                </p>

                                <div className="mt-4">
                                    <form action={addExerciseToRoutineDay} className="space-y-3">
                                        <input type="hidden" name="routineId" value={routine.id} />
                                        <input type="hidden" name="routineDayId" value={day.id} />

                                        <select
                                            name="exercise_name"
                                            required
                                            defaultValue=""
                                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                        >
                                            <option value="" disabled>
                                                Seleccionar ejercicio
                                            </option>
                                            {(exerciseOptions as ExerciseOption[] | null)?.map(
                                                (exercise) => (
                                                    <option key={exercise.id} value={exercise.name}>
                                                        {exercise.name}
                                                        {exercise.muscle_group
                                                            ? ` · ${exercise.muscle_group}`
                                                            : ''}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                name="sets"
                                                placeholder="Series"
                                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                            />
                                            <input
                                                name="reps"
                                                placeholder="Reps"
                                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                            />
                                            <input
                                                name="rest_seconds"
                                                type="number"
                                                placeholder="Descanso"
                                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                                        >
                                            + Agregar ejercicio
                                        </button>
                                    </form>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {dayExercises.length > 0 ? (
                                        dayExercises.map((exercise, index) => {
                                            const logs = logsByExercise[exercise.id] || []
                                            const latestLog = logs[0]

                                            const bestWeight = Math.max(
                                                ...logs.map((log) => log.weight || 0),
                                                0
                                            )

                                            const isPR =
                                                latestLog?.weight !== null &&
                                                latestLog?.weight === bestWeight &&
                                                logs.length > 1

                                            return (
                                                <div
                                                    key={exercise.id}
                                                    className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-medium text-white">
                                                                {index + 1}. {exercise.exercise_name}
                                                            </p>

                                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                                                                <span>Series: {exercise.sets || '-'}</span>
                                                                <span>Reps objetivo: {exercise.reps || '-'}</span>
                                                                <span>
                                                                    Descanso:{' '}
                                                                    {exercise.rest_seconds
                                                                        ? `${exercise.rest_seconds}s`
                                                                        : '-'}
                                                                </span>
                                                            </div>

                                                            {latestLog ? (
                                                                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-xs text-zinc-300">
                                                                    <p className="font-medium text-zinc-100">
                                                                        Último registro
                                                                    </p>
                                                                    <p className="mt-1">
                                                                        Peso: {latestLog.weight ?? '-'} kg · Reps:{' '}
                                                                        {latestLog.reps ?? '-'} · Fecha:{' '}
                                                                        {latestLog.performed_at ?? '-'}
                                                                    </p>

                                                                    {isPR && (
                                                                        <p className="mt-1 text-xs font-semibold text-green-400">
                                                                            🔥 Nuevo PR
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="mt-3 text-xs text-zinc-500">
                                                                    Todavía no hay registros de carga.
                                                                </p>
                                                            )}
                                                        </div>

                                                        <form action={deleteExerciseFromRoutineDay}>
                                                            <input
                                                                type="hidden"
                                                                name="routineId"
                                                                value={routine.id}
                                                            />
                                                            <input
                                                                type="hidden"
                                                                name="exerciseId"
                                                                value={exercise.id}
                                                            />
                                                            <button
                                                                type="submit"
                                                                className="rounded-lg border border-red-900 px-3 py-1 text-xs text-red-400 hover:bg-red-950/40"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </form>
                                                    </div>

                                                    <form
                                                        action={addExerciseLog}
                                                        className="mt-4 space-y-3 border-t border-zinc-800 pt-4"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="routineId"
                                                            value={routine.id}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="studentId"
                                                            value={routine.student_id}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="routineDayExerciseId"
                                                            value={exercise.id}
                                                        />

                                                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                                            Registrar carga
                                                        </p>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            <input
                                                                name="weight"
                                                                type="number"
                                                                step="0.5"
                                                                placeholder="Peso"
                                                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                                            />
                                                            <input
                                                                name="performed_reps"
                                                                type="number"
                                                                placeholder="Reps"
                                                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                                            />
                                                            <input
                                                                name="performed_at"
                                                                type="date"
                                                                defaultValue={new Date().toISOString().slice(0, 10)}
                                                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                                            />
                                                        </div>

                                                        <button
                                                            type="submit"
                                                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                                                        >
                                                            Guardar carga
                                                        </button>
                                                    </form>

                                                    {logs.length > 0 && (
                                                        <div className="mt-4 border-t border-zinc-800 pt-4">
                                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                                                Historial
                                                            </p>

                                                            <div className="space-y-2">
                                                                {logs.slice(0, 5).map((log) => (
                                                                    <div
                                                                        key={log.id}
                                                                        className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2 text-xs text-zinc-300"
                                                                    >
                                                                        {log.performed_at ?? '-'} ·{' '}
                                                                        {log.weight ?? '-'} kg · {log.reps ?? '-'} reps
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <ExerciseProgressChart logs={logs} />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <p className="text-sm text-zinc-500">
                                            Todavía no hay ejercicios en este día.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}