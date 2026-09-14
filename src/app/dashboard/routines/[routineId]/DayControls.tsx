'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

type ActionResult = { ok: boolean; error?: string }

type Props = {
    routineId: string
    dayId: string
    initialTitle: string
    weekId: string
    monthId: string | null
    canManageStructure: boolean
    canMoveLeft: boolean
    canMoveRight: boolean
    canDelete: boolean
    renameAction: (input: { routineId: string; dayId: string; title: string }) => Promise<ActionResult>
    duplicateAction: (input: { routineId: string; dayId: string }) => Promise<ActionResult & { newDayId?: string }>
    moveAction: (input: { routineId: string; dayId: string; direction: 'left' | 'right' }) => Promise<ActionResult>
    deleteAction: (input: { routineId: string; dayId: string }) => Promise<ActionResult & { nextDayId?: string }>
}

export default function DayControls({
    routineId,
    dayId,
    initialTitle,
    weekId,
    monthId,
    canManageStructure,
    canMoveLeft,
    canMoveRight,
    canDelete,
    renameAction,
    duplicateAction,
    moveAction,
    deleteAction,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = React.useTransition()
    const [isEditing, setIsEditing] = React.useState(false)
    const [confirmCopy, setConfirmCopy] = React.useState(false)
    const [confirmDelete, setConfirmDelete] = React.useState(false)
    const [title, setTitle] = React.useState(initialTitle)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        setTitle(initialTitle)
        setIsEditing(false)
        setConfirmCopy(false)
        setConfirmDelete(false)
        setError(null)
    }, [dayId, initialTitle])

    function saveName(event: React.FormEvent) {
        event.preventDefault()
        setError(null)
        startTransition(async () => {
            const result = await renameAction({ routineId, dayId, title })
            if (!result.ok) {
                setError(result.error || 'No se pudo guardar.')
                return
            }
            setIsEditing(false)
            router.refresh()
        })
    }

    function copyDay() {
        setError(null)
        startTransition(async () => {
            const result = await duplicateAction({ routineId, dayId })
            if (!result.ok || !result.newDayId) {
                setError(result.error || 'No se pudo duplicar el día.')
                setConfirmCopy(false)
                return
            }

            const params = new URLSearchParams({ week: weekId, day: result.newDayId })
            if (monthId) params.set('month', monthId)
            router.push(`/dashboard/routines/${routineId}?${params.toString()}`)
            router.refresh()
        })
    }

    function moveDay(direction: 'left' | 'right') {
        setError(null)
        startTransition(async () => {
            try {
                const result = await moveAction({ routineId, dayId, direction })
                if (!result.ok) {
                    setError(result.error || 'No se pudo mover el día.')
                    return
                }

                const params = new URLSearchParams({ week: weekId, day: dayId })
                if (monthId) params.set('month', monthId)
                router.replace(`/dashboard/routines/${routineId}?${params.toString()}`)
                router.refresh()
            } catch {
                setError('No se pudo mover el día. Intentá nuevamente.')
            }
        })
    }

    function removeDay() {
        setError(null)
        startTransition(async () => {
            try {
                const result = await deleteAction({ routineId, dayId })
                if (!result.ok || !result.nextDayId) {
                    setError(result.error || 'No se pudo eliminar el día.')
                    setConfirmDelete(false)
                    return
                }

                const params = new URLSearchParams({ week: weekId, day: result.nextDayId })
                if (monthId) params.set('month', monthId)
                router.push(`/dashboard/routines/${routineId}?${params.toString()}`)
                router.refresh()
            } catch {
                setError('No se pudo eliminar el día. Intentá nuevamente.')
                setConfirmDelete(false)
            }
        })
    }

    if (isEditing) {
        return (
            <div className="w-full">
                <form onSubmit={saveName} className="flex items-center gap-2">
                    <input
                        autoFocus
                        maxLength={60}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                setTitle(initialTitle)
                                setIsEditing(false)
                            }
                        }}
                        className="min-w-0 flex-1 rounded-xl border border-indigo-500 bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none"
                    />
                    <button disabled={isPending} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                        {isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                            setTitle(initialTitle)
                            setIsEditing(false)
                        }}
                        className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground"
                    >
                        Cancelar
                    </button>
                </form>
                {error && <p role="alert" className="mt-1 text-xs font-medium text-red-500">{error}</p>}
            </div>
        )
    }

    return (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {canManageStructure && (
                <div className="flex h-8 items-center rounded-lg border border-border bg-card">
                    <button
                        type="button"
                        aria-label="Mover día a la izquierda"
                        title={canMoveLeft ? 'Mover día a la izquierda' : 'El día ya está primero'}
                        disabled={isPending || !canMoveLeft}
                        onClick={() => moveDay('left')}
                        className="flex h-full w-8 items-center justify-center text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        ←
                    </button>
                    <span className="h-4 w-px bg-border" />
                    <button
                        type="button"
                        aria-label="Mover día a la derecha"
                        title={canMoveRight ? 'Mover día a la derecha' : 'El día ya está último'}
                        disabled={isPending || !canMoveRight}
                        onClick={() => moveDay('right')}
                        className="flex h-full w-8 items-center justify-center text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        →
                    </button>
                </div>
            )}

            <button
                type="button"
                aria-label="Renombrar día"
                title="Renombrar día"
                disabled={isPending}
                onClick={() => setIsEditing(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931ZM19.5 7.125 16.875 4.5M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                <span className="hidden sm:inline">Renombrar</span>
            </button>

            {confirmCopy ? (
                <div className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-1">
                    <span className="px-1 text-[10px] text-muted-foreground">¿Copiar completo?</span>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={copyDay}
                        className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                    >
                        {isPending ? 'Copiando...' : 'Sí'}
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setConfirmCopy(false)}
                        className="rounded-md px-2 py-1 text-[10px] text-muted-foreground"
                    >
                        No
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    aria-label="Duplicar día"
                    title="Duplicar día"
                    disabled={isPending}
                    onClick={() => setConfirmCopy(true)}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75A1.125 1.125 0 0 1 3.75 20.625v-9.75c0-.621.504-1.125 1.125-1.125H8.25m7.5 7.5h3.375c.621 0 1.125-.504 1.125-1.125v-9.75c0-.621-.504-1.125-1.125-1.125h-9.75c-.621 0-1.125.504-1.125 1.125V9.75m7.5 7.5h-7.5v-7.5h7.5v7.5Z" />
                    </svg>
                    <span className="hidden sm:inline">Duplicar</span>
                </button>
            )}

            {canManageStructure && (confirmDelete ? (
                <div className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/5 p-1">
                    <span className="px-1 text-[10px] text-muted-foreground">¿Eliminar?</span>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={removeDay}
                        className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                    >
                        {isPending ? 'Eliminando...' : 'Sí'}
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-md px-2 py-1 text-[10px] text-muted-foreground"
                    >
                        No
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    aria-label="Eliminar día"
                    title={canDelete ? 'Eliminar día' : 'La semana debe conservar al menos un día'}
                    disabled={isPending || !canDelete}
                    onClick={() => setConfirmDelete(true)}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/5 px-2 text-[11px] font-medium text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    <span className="hidden sm:inline">Eliminar</span>
                </button>
            ))}
            {error && <p role="alert" className="w-full text-right text-xs font-medium text-red-500">{error}</p>}
        </div>
    )
}
