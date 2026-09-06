'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
        >
            {pending ? 'Eliminando…' : 'Eliminar'}
        </button>
    )
}

type DeleteTemplateButtonProps = {
    routineId: string
    deleteAction: (formData: FormData) => Promise<void>
}

export default function DeleteTemplateButton({
    routineId,
    deleteAction,
}: DeleteTemplateButtonProps) {
    return (
        <form
            action={deleteAction}
            onSubmit={(event) => {
                if (!confirm('¿Eliminar este template? No se puede deshacer.')) {
                    event.preventDefault()
                }
            }}
        >
            <input type="hidden" name="routineId" value={routineId} />
            <SubmitButton />
        </form>
    )
}
