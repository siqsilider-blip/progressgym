'use client'

import { useTransition } from 'react'
import { deactivateStudent } from './actions'

export default function DeleteStudentButton({ studentId }: { studentId: string }) {
    const [isPending, startTransition] = useTransition()

    function handleDeactivate() {
        if (!confirm('¿Dar de baja a este alumno del seguimiento? Su cuenta y su historial se conservarán.')) return

        const formData = new FormData()
        formData.append('studentId', studentId)

        startTransition(async () => {
            await deactivateStudent(formData)
        })
    }

    return (
        <details className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3">
            <summary className="cursor-pointer list-none text-xs font-medium text-red-400/80 [&::-webkit-details-marker]:hidden">
                Dar de baja
            </summary>
            <div className="mt-3">
            <p className="text-sm font-medium text-card-foreground">
                Finalizar seguimiento
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                Desactiva su programa y lo marca como inactivo. Su cuenta,
                historial y datos personales no se eliminan.
            </p>
            <button
                type="button"
                onClick={handleDeactivate}
                disabled={isPending}
                className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
                {isPending ? 'Procesando...' : 'Dar de baja del seguimiento'}
            </button>
            </div>
        </details>
    )
}
