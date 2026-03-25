'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')

    const containerRef = useRef<HTMLDivElement | null>(null)
    const searchInputRef = useRef<HTMLInputElement | null>(null)

    const searchParams = useSearchParams()
    const currentDayId = searchParams.get('day') || routineDayId

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                searchInputRef.current?.focus()
            }, 0)
        } else {
            setSearch('')
        }
    }, [open])

    const filteredExercises = useMemo(() => {
        const term = search.trim().toLowerCase()

        if (!term) return exerciseOptions

        return exerciseOptions.filter((exercise) => {
            const name = exercise.name.toLowerCase()
            const muscleGroup = exercise.muscle_group?.toLowerCase() ?? ''
            return name.includes(term) || muscleGroup.includes(term)
        })
    }, [exerciseOptions, search])

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
            <input type="hidden" name="dayId" value={currentDayId} />

            <div ref={containerRef} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 outline-none transition hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                    {selectedExerciseName || 'Seleccionar ejercicio'}
                </button>

                {open && (
                    <div className="absolute z-50 mt-2 w-full rounded-xl border border-zinc-300 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar ejercicio o músculo..."
                                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                            />
                        </div>

                        <div className="max-h-72 space-y-2 overflow-y-auto p-2">
                            {filteredExercises.length > 0 ? (
                                filteredExercises.map((exercise) => {
                                    const isSelected =
                                        exercise.name === selectedExerciseName

                                    return (
                                        <button
                                            key={exercise.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedExerciseName(exercise.name)
                                                setOpen(false)
                                            }}
                                            className={`w-full rounded-lg border p-3 text-left transition ${isSelected
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {exercise.name}
                                            </div>

                                            {exercise.muscle_group && (
                                                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                    {exercise.muscle_group}
                                                </div>
                                            )}

                                            {exercise.metric_type && (
                                                <div className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                                                    {exercise.metric_type === 'time'
                                                        ? 'Tiempo'
                                                        : 'Peso / reps'}
                                                </div>
                                            )}
                                        </button>
                                    )
                                })
                            ) : (
                                <div className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                                    No se encontraron ejercicios.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <input
                type="hidden"
                name="exercise_name"
                value={selectedExerciseName}
            />

            {selectedExercise && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <div className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        Ejercicio seleccionado
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {selectedExercise.name}
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {[
                            selectedExercise.muscle_group,
                            selectedExercise.metric_type === 'time'
                                ? 'Tiempo'
                                : selectedExercise.metric_type === 'reps'
                                    ? 'Peso / reps'
                                    : null,
                        ]
                            .filter(Boolean)
                            .join(' • ')}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-2">
                <input
                    name="sets"
                    placeholder="Series"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                />

                <input
                    name="reps"
                    placeholder={isTimeExercise ? 'Duración' : 'Reps objetivo'}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                />

                <input
                    name="rest_seconds"
                    type="number"
                    placeholder="Descanso"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                />
            </div>

            {isTimeExercise && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Para cardio, el campo central se usa como duración en minutos.
                </p>
            )}

            <button
                type="submit"
                className="h-11 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 active:scale-[0.98]"
            >
                + Agregar ejercicio
            </button>
        </form>
    )
}