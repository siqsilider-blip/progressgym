'use client'

import { useTransition } from 'react'
import { deleteStudent } from './actions'

export default function DeleteStudentButton({ studentId }: { studentId: string }) {
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        if (!confirm('¿Estás seguro? Esta acción eliminará todos los datos del alumno permanentemente.')) return

        const formData = new FormData()
        formData.append('studentId', studentId)

        startTransition(async () => {
            await deleteStudent(formData)
        })
    }

    return (
        <div className="mt-6 rounded-2xl border border-red-200 bg-card p-4 dark:border-red-900/40">
            <p className="text-sm font-medium text-card-foreground">
                Zona de peligro
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                Eliminar al alumno borra permanentemente todos sus datos,
                registros y progreso. Esta acción no se puede deshacer.
            </p>
            <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
                {isPending ? 'Eliminando...' : 'Eliminar alumno'}
            </button>
        </div>
    )
}
