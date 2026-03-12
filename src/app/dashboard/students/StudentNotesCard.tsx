'use client'

import { useState, useTransition } from 'react'
import { saveStudentNote } from './[studentId]/actions'

type Props = {
    studentId: string
    initialNote: string
}

export default function StudentNotesCard({
    studentId,
    initialNote,
}: Props) {
    const [note, setNote] = useState(initialNote)
    const [message, setMessage] = useState('')
    const [isPending, startTransition] = useTransition()

    function handleSave() {
        setMessage('')

        startTransition(async () => {
            const result = await saveStudentNote(studentId, note)

            if (result?.error) {
                setMessage(result.error)
                return
            }

            setMessage('Nota guardada')
        })
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Notas del entrenador
            </h2>

            <div className="space-y-4">
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Escribí observaciones del alumno, molestias, técnica, objetivos..."
                    className="min-h-[180px] w-full rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-500"
                />

                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-zinc-400">
                        {message || 'Guardá observaciones para hacer seguimiento.'}
                    </p>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? 'Guardando...' : 'Guardar nota'}
                    </button>
                </div>
            </div>
        </div>
    )
}