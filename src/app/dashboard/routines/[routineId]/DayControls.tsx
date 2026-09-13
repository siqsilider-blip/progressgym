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
    renameAction: (input: { routineId: string; dayId: string; title: string }) => Promise<ActionResult>
    duplicateAction: (input: { routineId: string; dayId: string }) => Promise<ActionResult & { newDayId?: string }>
}

export default function DayControls({
    routineId,
    dayId,
    initialTitle,
    weekId,
    monthId,
    renameAction,
    duplicateAction,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = React.useTransition()
    const [isEditing, setIsEditing] = React.useState(false)
    const [confirmCopy, setConfirmCopy] = React.useState(false)
    const [title, setTitle] = React.useState(initialTitle)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        setTitle(initialTitle)
        setIsEditing(false)
        setConfirmCopy(false)
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
        <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
                type="button"
                disabled={isPending}
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
                Renombrar
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
                    disabled={isPending}
                    onClick={() => setConfirmCopy(true)}
                    className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                    Duplicar día
                </button>
            )}
            {error && <p role="alert" className="w-full text-right text-xs font-medium text-red-500">{error}</p>}
        </div>
    )
}
