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
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                    Notas del entrenador
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                    Observaciones, molestias, técnica, objetivos o seguimiento.
                </p>
            </div>

            <form action={formAction} className="space-y-4">
                <textarea
                    name="note"
                    defaultValue={initialNote}
                    rows={6}
                    placeholder="Escribí observaciones del alumno..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-500"
                />

                <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-zinc-500">
                        {state?.error ? (
                            <span className="text-red-400">{state.error}</span>
                        ) : state?.success ? (
                            <span className="text-emerald-400">Nota guardada.</span>
                        ) : (
                            'Guardá observaciones para hacer seguimiento.'
                        )}
                    </div>

                    <SaveButton />
                </div>
            </form>
        </div>
    )
}