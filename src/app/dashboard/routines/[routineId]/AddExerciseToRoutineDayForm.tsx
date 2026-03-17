'use client'

import { useMemo, useState } from 'react'
import { addExerciseToRoutineDay } from './actions'

type ExerciseOption = {
    id: string
    name: string
    muscle_group: string | null
    metric_type: 'reps' | 'time' | null
}

type Props = {
    routineId: string
    routineDayId: string
    exerciseOptions: ExerciseOption[]
}

export default function AddExerciseToRoutineDayForm({
    routineId,
    routineDayId,
    exerciseOptions,
}: Props) {
    const [selectedExerciseName, setSelectedExerciseName] = useState('')

    const selectedExercise = useMemo(
        () =>
            exerciseOptions.find(
                (exercise) => exercise.name === selectedExerciseName
            ) ?? null,
        [exerciseOptions, selectedExerciseName]
    )

    const isTimeExercise = selectedExercise?.metric_type === 'time'

    return (
        <form action={addExerciseToRoutineDay} className="space-y-3">
            <input type="hidden" name="routineId" value={routineId} />
            <input type="hidden" name="routineDayId" value={routineDayId} />

            <select
                name="exercise_name"
                required
                value={selectedExerciseName}
                onChange={(e) => setSelectedExerciseName(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
                <option value="" disabled>
                    Seleccionar ejercicio
                </option>

                {exerciseOptions.map((exercise) => (
                    <option key={exercise.id} value={exercise.name}>
                        {exercise.name}
                        {exercise.muscle_group ? ` · ${exercise.muscle_group}` : ''}
                    </option>
                ))}
            </select>

            <div className="grid grid-cols-3 gap-2">
                <input
                    name="sets"
                    placeholder="Series"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                />

                <input
                    name="reps"
                    placeholder={
                        isTimeExercise ? 'Duración objetivo (min)' : 'Reps objetivo'
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                />

                <input
                    name="rest_seconds"
                    type="number"
                    placeholder="Descanso"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
            </div>

            {isTimeExercise && (
                <p className="text-xs text-zinc-500">
                    Para cardio, el campo central se usa como duración en minutos.
                </p>
            )}

            <button
                type="submit"
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
                + Agregar ejercicio
            </button>
        </form>
    )
}