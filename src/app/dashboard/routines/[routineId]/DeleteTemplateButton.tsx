'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            aria-label="Eliminar template"
            title="Eliminar template"
            disabled={pending}
            className="flex h-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
        >
            {pending ? (
                '…'
            ) : (
                <>
                    <svg aria-hidden="true" className="h-3.5 w-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    <span className="hidden sm:inline">Eliminar</span>
                </>
            )}
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
