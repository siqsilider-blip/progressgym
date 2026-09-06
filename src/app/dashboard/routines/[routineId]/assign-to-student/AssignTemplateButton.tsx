'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? 'Asignando…' : 'Asignar'}
        </button>
    )
}

type AssignTemplateButtonProps = {
    templateId: string
    studentId: string
    studentName: string
    hasActiveProgram: boolean
    assignAction: (formData: FormData) => Promise<void>
}

export default function AssignTemplateButton({
    templateId,
    studentId,
    studentName,
    hasActiveProgram,
    assignAction,
}: AssignTemplateButtonProps) {
    // Mensaje distinto y más específico si ya hay un programa activo, para
    // que reemplazarlo sea una decisión consciente y no un clic de más --
    // no alcanza con deshabilitar el botón mientras está pendiente, hace
    // falta que la persona lea qué va a pasar antes de confirmar.
    const confirmMessage = hasActiveProgram
        ? `${studentName} ya tiene un programa activo. Asignar este template le va a crear un programa nuevo y va a marcar el actual como completado (queda guardado en su historial, no se borra). ¿Confirmás?`
        : `¿Asignar este template a ${studentName}?`

    return (
        <form
            action={assignAction}
            onSubmit={(event) => {
                if (!confirm(confirmMessage)) {
                    event.preventDefault()
                }
            }}
        >
            <input type="hidden" name="templateId" value={templateId} />
            <input type="hidden" name="studentId" value={studentId} />
            <SubmitButton />
        </form>
    )
}
