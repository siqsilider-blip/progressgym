'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Student = {
    id: string
    first_name: string
    last_name: string
}

type Props = {
    students: Student[]
    selectedStudentId: string
}

export default function StudentRoutineSelector({
    students,
    selectedStudentId,
}: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)

    const selectedStudent = students.find((s) => s.id === selectedStudentId)

    const selectedName = selectedStudent
        ? `${selectedStudent.first_name} ${selectedStudent.last_name}`.trim()
        : 'Seleccionar alumno'

    const handleSelect = (id: string) => {
        setOpen(false)
        router.push(`/dashboard/routines?studentId=${id}`)
    }

    return (
        <div className="space-y-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Alumno</p>

            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-left text-sm text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
            >
                {selectedName}
            </button>

            {open && (
                <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
                    <div
                        className="absolute inset-x-4 bottom-24 mx-auto w-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                Seleccionar alumno
                            </p>

                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:hover:text-zinc-300"
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                            {students.map((student) => {
                                const name =
                                    `${student.first_name} ${student.last_name}`.trim() ||
                                    'Sin nombre'

                                const isSelected = student.id === selectedStudentId

                                return (
                                    <button
                                        key={student.id}
                                        type="button"
                                        onClick={() => handleSelect(student.id)}
                                        className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${isSelected
                                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                                                : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        {name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}