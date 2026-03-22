import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { type WeightUnit } from '@/lib/weight'
import { saveWorkoutSession } from './actions'
import TrainExerciseTable from './TrainExerciseTable'

type PageProps = {
    params: {
        studentId: string
    }
    searchParams?: {
        day?: string
        saved?: string
        error?: string
    }
}

type ExerciseMeta = {
    id: string
    name: string | null
    metric_type: 'reps' | 'time' | null
}

type ExerciseLog = {
    id: string
    routine_day_exercise_id: string
    weight: number | null
    reps: number | null
    performed_at: string | null
    created_at: string | null
    set_index: number | null
}

export default async function StudentTrainPage({
    params,
    searchParams,
}: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const trainerProfile = await getTrainerProfile()
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, trainer_id')
        .eq('id', params.studentId)
        .eq('trainer_id', user.id)
        .single()

    if (studentError || !student) {
        return (
            <div className="p-6 text-white">
                <h1 className="text-xl font-semibold">No se encontró el alumno.</h1>
            </div>
        )
    }

    let assignedRoutineId: string | null = null
    let routineName = 'Rutina asignada'

    const { data: assignment } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', params.studentId)
        .maybeSingle()

    if (assignment?.routine_id) {
        const { data: assignedRoutine } = await supabase
            .from('routines')
            .select('id, name, student_id, trainer_id')
            .eq('id', assignment.routine_id)
            .eq('trainer_id', user.id)
            .eq('student_id', params.studentId)
            .maybeSingle()

        if (assignedRoutine?.id) {
            assignedRoutineId = assignedRoutine.id
            routineName = assignedRoutine.name ?? 'Rutina asignada'
        }
    }

    if (!assignedRoutineId) {
        const { data: fallbackRoutine } = await supabase
            .from('routines')
            .select('id, name')
            .eq('student_id', params.studentId)
            .eq('trainer_id', user.id)
            .maybeSingle()

        if (fallbackRoutine?.id) {
            assignedRoutineId = fallbackRoutine.id
            routineName = fallbackRoutine.name ?? 'Rutina asignada'

            const { data: existingAssignment } = await supabase
                .from('student_routines')
                .select('id')
                .eq('student_id', params.studentId)
                .maybeSingle()

            if (existingAssignment?.id) {
                await supabase
                    .from('student_routines')
                    .update({
                        routine_id: fallbackRoutine.id,
                        assigned_at: new Date().toISOString(),
                    })
                    .eq('id', existingAssignment.id)
            } else {
                await supabase.from('student_routines').insert({
                    student_id: params.studentId,
                    routine_id: fallbackRoutine.id,
                    assigned_at: new Date().toISOString(),
                })
            }
        }
    }

    if (!assignedRoutineId) {
        return (
            <div className="p-6 text-white md:p-8">
                <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h1 className="text-2xl font-bold">
                        {student.first_name} {student.last_name}
                    </h1>

                    <p className="mt-2 text-sm text-zinc-400">
                        Este alumno todavía no tiene una rutina asignada.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href={`/dashboard/students/${params.studentId}/assign-routine`}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            Asignar rutina
                        </Link>

                        <Link
                            href={`/dashboard/students/${params.studentId}`}
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                        >
                            Volver al perfil
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const { data: routine } = await supabase
        .from('routines')
        .select('id, name')
        .eq('id', assignedRoutineId)
        .eq('student_id', params.studentId)
        .eq('trainer_id', user.id)
        .maybeSingle()

    const { data: routineDays } = await supabase
        .from('routine_days')
        .select('id, name, day_number')
        .eq('routine_id', assignedRoutineId)
        .order('day_number', { ascending: true })

    const selectedDayId =
        searchParams?.day && routineDays?.some((day) => day.id === searchParams.day)
            ? searchParams.day
            : routineDays?.[0]?.id ?? null

    const selectedDay =
        routineDays?.find((day) => day.id === selectedDayId) ?? null

    let exercisesForDay: {
        id: string
        exercise_id: string | null
        sets: number | null
        reps: number | null
    }[] = []

    if (selectedDayId) {
        const { data: rde } = await supabase
            .from('routine_day_exercises')
            .select('id, exercise_id, sets, reps')
            .eq('routine_day_id', selectedDayId)
            .order('id', { ascending: true })

        exercisesForDay = rde ?? []
    }

    const exerciseIds = Array.from(
        new Set(
            exercisesForDay
                .map((item) => item.exercise_id)
                .filter((id): id is string => Boolean(id))
        )
    )

    let exercises: ExerciseMeta[] = []

    if (exerciseIds.length > 0) {
        const { data: exercisesData } = await supabase
            .from('exercises')
            .select('id, name, metric_type')
            .in('id', exerciseIds)

        exercises = (exercisesData as ExerciseMeta[] | null) ?? []
    }

    const exerciseMap = new Map<string, ExerciseMeta>()
    for (const exercise of exercises) {
        if (exercise.id) {
            exerciseMap.set(exercise.id, exercise)
        }
    }

    const today = new Date().toISOString().slice(0, 10)

    const totalExercises = exercisesForDay.length
    const totalSets = exercisesForDay.reduce((acc, item) => {
        return acc + Math.max(1, Number(item.sets ?? 1))
    }, 0)

    const selectedDayLabel = selectedDay?.name?.trim()
        ? selectedDay.name.trim()
        : selectedDay?.day_number
            ? `Día ${selectedDay.day_number}`
            : 'Día seleccionado'

    const routineDayExerciseIds = exercisesForDay.map((item) => item.id)

    const logsByExerciseId = new Map<
        string,
        { weights: Array<number | null>; reps: Array<number | null> }
    >()

    if (routineDayExerciseIds.length > 0) {
        const { data: allLogs } = await supabase
            .from('exercise_logs')
            .select(
                'id, routine_day_exercise_id, weight, reps, performed_at, created_at, set_index'
            )
            .eq('student_id', params.studentId)
            .in('routine_day_exercise_id', routineDayExerciseIds)
            .order('performed_at', { ascending: false })
            .order('set_index', { ascending: true })

        const typedLogs = (allLogs as ExerciseLog[] | null) ?? []

        for (const exerciseRow of exercisesForDay) {
            const setsCount = Math.max(1, Number(exerciseRow.sets ?? 1))

            const logsForExercise = typedLogs.filter(
                (log) => log.routine_day_exercise_id === exerciseRow.id
            )

            if (logsForExercise.length === 0) continue

            const latestPerformedAt =
                logsForExercise.find((log) => log.performed_at)?.performed_at ?? null

            let latestSessionLogs = latestPerformedAt
                ? logsForExercise.filter((log) => log.performed_at === latestPerformedAt)
                : logsForExercise

            latestSessionLogs = latestSessionLogs
                .slice()
                .sort((a, b) => {
                    const aSet = a.set_index ?? 999
                    const bSet = b.set_index ?? 999
                    return aSet - bSet
                })
                .slice(0, setsCount)

            const weights = latestSessionLogs.map((log) => log.weight ?? null)
            const reps = latestSessionLogs.map((log) => log.reps ?? null)

            logsByExerciseId.set(exerciseRow.id, { weights, reps })
        }
    }

    return (
        <div className="p-3 pb-40 text-white md:p-6 md:pb-28">
            <div className="mx-auto max-w-4xl">
                <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 md:mb-4 md:p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-semibold text-white md:text-xl">
                                {student.first_name} {student.last_name}
                            </h1>

                            <p className="truncate text-xs text-zinc-400">
                                {routine?.name ?? routineName}
                            </p>
                        </div>

                        <Link
                            href={`/dashboard/students/${params.studentId}`}
                            className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-800"
                        >
                            Volver
                        </Link>
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-[10px]">
                        <span className="whitespace-nowrap rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-1 text-zinc-300">
                            {selectedDayLabel}
                        </span>
                        <span className="whitespace-nowrap rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-1 text-zinc-300">
                            {totalExercises} ej
                        </span>
                        <span className="whitespace-nowrap rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-1 text-zinc-300">
                            {totalSets} sets
                        </span>
                    </div>
                </div>

                {searchParams?.saved === '1' && (
                    <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                        Entrenamiento guardado correctamente.
                    </div>
                )}

                {searchParams?.error === 'empty' && (
                    <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
                        Completá al menos una serie antes de guardar.
                    </div>
                )}

                <div className="mb-3">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {routineDays?.map((day, index) => {
                            const label =
                                day.name?.trim() || `Día ${day.day_number ?? index + 1}`
                            const isActive = day.id === selectedDayId

                            return (
                                <Link
                                    key={day.id}
                                    href={`/dashboard/students/${params.studentId}/train?day=${day.id}`}
                                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                                            ? 'bg-indigo-600 text-white'
                                            : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                                        }`}
                                >
                                    {label}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {!selectedDay ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
                        Esta rutina no tiene días creados todavía.
                    </div>
                ) : exercisesForDay.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <h3 className="text-lg font-semibold text-zinc-100">
                            Este día todavía no tiene ejercicios cargados.
                        </h3>
                        <p className="mt-2 text-sm text-zinc-400">
                            Agregá ejercicios a este día para poder registrar la sesión.
                        </p>
                    </div>
                ) : (
                    <form action={saveWorkoutSession} className="space-y-3 md:space-y-4">
                        <input type="hidden" name="student_id" value={student.id} />
                        <input type="hidden" name="selected_day_id" value={selectedDay.id} />

                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-100 md:text-lg">
                                        Registro de sesión
                                    </h2>
                                    <p className="text-sm text-zinc-400">
                                        Cargá los datos reales en formato rápido.
                                    </p>
                                </div>

                                <div className="w-full md:w-auto">
                                    <label className="mb-2 block text-sm text-zinc-400">
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        name="performed_at"
                                        defaultValue={today}
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 md:w-[220px]"
                                    />
                                </div>
                            </div>
                        </div>

                        {exercisesForDay.map((exercise, exerciseIndex) => {
                            const exerciseMeta = exercise.exercise_id
                                ? exerciseMap.get(exercise.exercise_id) ?? null
                                : null

                            const exerciseName = exerciseMeta?.name ?? 'Ejercicio'
                            const isCardio = exerciseMeta?.metric_type === 'time'
                            const setsCount = Math.max(1, Number(exercise.sets ?? 1))
                            const objectiveText = exercise.reps
                                ? isCardio
                                    ? `${exercise.reps} min`
                                    : `${exercise.reps} reps`
                                : null

                            const previousSession = logsByExerciseId.get(exercise.id)

                            return (
                                <section
                                    key={exercise.id}
                                    className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
                                >
                                    <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3 md:px-5 md:py-4">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                                                Ejercicio {exerciseIndex + 1}
                                            </p>

                                            <h3 className="mt-1 truncate text-base font-semibold text-zinc-100 md:text-lg">
                                                {exerciseName}
                                            </h3>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap justify-end gap-2 text-[10px] md:text-xs">
                                            <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-1 text-zinc-300">
                                                {setsCount} series
                                            </span>

                                            {objectiveText && (
                                                <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-2.5 py-1 text-zinc-300">
                                                    {objectiveText}
                                                </span>
                                            )}

                                            <span
                                                className={`rounded-full border px-2.5 py-1 ${isCardio
                                                        ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
                                                        : 'border-violet-500/20 bg-violet-500/10 text-violet-300'
                                                    }`}
                                            >
                                                {isCardio ? 'Cardio' : 'Fuerza'}
                                            </span>
                                        </div>
                                    </div>

                                    <TrainExerciseTable
                                        exerciseId={exercise.id}
                                        isCardio={isCardio}
                                        setsCount={setsCount}
                                        weightUnit={weightUnit}
                                        defaultReps={exercise.reps}
                                        initialWeights={previousSession?.weights}
                                        initialReps={previousSession?.reps}
                                    />
                                </section>
                            )
                        })}

                        <div className="h-32 md:h-20" />

                        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur md:bottom-0">
                            <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:px-8">
                                <div>
                                    <p className="text-sm font-medium text-zinc-100">
                                        Guardar sesión
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                        {selectedDayLabel} • {totalExercises} ejercicios
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Link
                                        href={`/dashboard/students/${params.studentId}`}
                                        className="rounded-xl border border-zinc-700 px-5 py-3 text-center text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                                    >
                                        Cancelar
                                    </Link>

                                    <button
                                        type="submit"
                                        className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
                                    >
                                        Guardar entrenamiento
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}