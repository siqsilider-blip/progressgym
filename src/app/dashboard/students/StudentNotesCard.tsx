'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { saveStudentNote } from './[studentId]/actions'

type Props = {
    studentId: string
    initialNote: string
}

type ActionState = {
    success?: boolean
    error?: string
}

const initialState: ActionState = {}

function SaveButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? 'Guardando...' : 'Guardar nota'}
        </button>
    )
}

export default function StudentNotesCard({
    studentId,
    initialNote,
}: Props) {
    const saveStudentNoteWithId = saveStudentNote.bind(null, studentId)
    const [state, formAction] = useFormState(saveStudentNoteWithId, initialState)

    return (
        <form action={formAction} className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Observaciones, molestias, técnica, objetivos o seguimiento.
            </p>

            <textarea
                name="note"
                defaultValue={initialNote}
                rows={4}
                placeholder="Escribí observaciones del alumno..."
                className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-zinc-500">
                    {state?.error ? (
                        <span className="text-red-500 dark:text-red-400">{state.error}</span>
                    ) : state?.success ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Nota guardada.</span>
                    ) : (
                        'Guardá observaciones para hacer seguimiento.'
                    )}
                </div>

                <SaveButton />
            </div>
        </form>
    )
}