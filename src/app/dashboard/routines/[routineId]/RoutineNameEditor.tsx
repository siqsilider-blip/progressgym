'use client'

import * as React from 'react'
import { Pencil } from 'lucide-react'

type Props = {
    routineId: string
    initialName: string
    updateAction: (input: { routineId: string; name: string }) => Promise<{ ok: boolean; error?: string }>
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function RoutineNameEditor({
    routineId,
    initialName,
    updateAction,
}: Props) {
    const [value, setValue] = React.useState(initialName)
    const [saveState, setSaveState] = React.useState<SaveState>('idle')
    const [errorMessage, setErrorMessage] = React.useState('')
    const [desktopEditing, setDesktopEditing] = React.useState(false)

    const inputRef = React.useRef<HTMLInputElement>(null)
    const editButtonRef = React.useRef<HTMLButtonElement>(null)
    const lastSavedValueRef = React.useRef(initialName.trim())
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const requestIdRef = React.useRef(0)

    React.useEffect(() => {
        setValue(initialName)
        lastSavedValueRef.current = initialName.trim()
    }, [initialName])

    React.useEffect(() => {
        if (desktopEditing) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [desktopEditing])

    React.useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
        }
    }, [])

    const runSave = React.useCallback(
        async (rawValue: string) => {
            const trimmed = rawValue.trim()

            if (!trimmed) {
                setSaveState('error')
                setErrorMessage('El nombre no puede estar vacío')
                return
            }

            if (trimmed === lastSavedValueRef.current) {
                setSaveState('saved')

                if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
                feedbackTimerRef.current = setTimeout(() => {
                    setSaveState('idle')
                }, 1200)

                return
            }

            const currentRequestId = ++requestIdRef.current

            setSaveState('saving')
            setErrorMessage('')

            let result: { ok: boolean; error?: string }

            try {
                result = await updateAction({
                    routineId,
                    name: trimmed,
                })
            } catch {
                if (currentRequestId !== requestIdRef.current) return
                setSaveState('error')
                setErrorMessage('No se pudo conectar. Intentá nuevamente.')
                return
            }

            if (currentRequestId !== requestIdRef.current) return

            if (!result.ok) {
                setSaveState('error')
                setErrorMessage(result.error || 'No se pudo guardar')
                return
            }

            lastSavedValueRef.current = trimmed
            setValue(trimmed)
            setSaveState('saved')

            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
            feedbackTimerRef.current = setTimeout(() => {
                setSaveState('idle')
            }, 1400)
        },
        [routineId, updateAction]
    )

    React.useEffect(() => {
        const trimmed = value.trim()

        if (!trimmed) {
            setSaveState((current) => current === 'error' ? current : 'idle')
            return
        }

        if (trimmed === lastSavedValueRef.current) {
            return
        }

        setSaveState('saving')
        setErrorMessage('')

        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(() => {
            void runSave(value)
        }, 700)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [value, runSave])

    function handleBlur() {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        void runSave(value)
        setDesktopEditing(false)
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
            if (desktopEditing) requestAnimationFrame(() => editButtonRef.current?.focus())
        }
    }

    return (
        <div>
            <div className={desktopEditing ? 'sr-only' : 'hidden items-baseline gap-2 lg:flex'}>
                <h1 className="min-w-0 font-[family-name:Georgia,'Times_New_Roman',serif] text-5xl leading-[1.04] tracking-[-0.045em] [overflow-wrap:anywhere]">
                    {value.trim() || initialName || 'Rutina'}
                </h1>
                <button
                    type="button"
                    ref={editButtonRef}
                    aria-label="Editar nombre de la rutina"
                    title="Editar nombre de la rutina"
                    onClick={() => setDesktopEditing(true)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                </button>
            </div>
            {!desktopEditing && <h1 className="sr-only lg:hidden">{value.trim() || initialName || 'Rutina'}</h1>}
            <div className="relative">
                <input
                    type="text"
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    aria-label="Nombre de la rutina"
                    placeholder="Nombre de la rutina"
                    className={`w-full min-w-0 border-b border-border bg-transparent pb-1 pr-20 text-xl font-bold text-foreground outline-none transition focus:border-primary md:text-2xl lg:pb-1.5 lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-5xl lg:font-normal lg:leading-[1.04] lg:tracking-[-0.045em] ${desktopEditing ? '' : 'lg:hidden'}`}
                />

                <span role="status" className={`absolute bottom-1.5 right-0 text-right ${desktopEditing ? '' : 'lg:static lg:mt-1 lg:block lg:text-left'}`}>
                    {saveState === 'saving' && (
                        <span className="text-xs font-medium text-muted-foreground">
                            Guardando...
                        </span>
                    )}

                    {saveState === 'saved' && (
                        <span className="text-xs font-medium text-emerald-400">
                            Guardado ✓
                        </span>
                    )}

                    {saveState === 'error' && (
                        <span className="text-xs font-medium text-red-400">
                            Error
                        </span>
                    )}
                </span>
            </div>

            {saveState === 'error' && errorMessage && (
                <p className="mt-1 text-xs text-red-400">{errorMessage}</p>
            )}
        </div>
    )
}
