'use client'

import * as React from 'react'
import { updateRoutineName } from './actions'

type Props = {
    routineId: string
    initialName: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function RoutineNameEditor({
    routineId,
    initialName,
}: Props) {
    const [value, setValue] = React.useState(initialName)
    const [saveState, setSaveState] = React.useState<SaveState>('idle')
    const [errorMessage, setErrorMessage] = React.useState('')

    const lastSavedValueRef = React.useRef(initialName.trim())
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const requestIdRef = React.useRef(0)

    React.useEffect(() => {
        setValue(initialName)
        lastSavedValueRef.current = initialName.trim()
    }, [initialName])

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

            const result = await updateRoutineName({
                routineId,
                name: trimmed,
            })

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
        [routineId]
    )

    React.useEffect(() => {
        const trimmed = value.trim()

        if (!trimmed) {
            if (saveState !== 'error') {
                setSaveState('idle')
            }
            return
        }

        if (trimmed === lastSavedValueRef.current) {
            if (saveState === 'saving') return
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
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (debounceRef.current) clearTimeout(debounceRef.current)
            void runSave(value)
                ; (e.target as HTMLInputElement).blur()
        }
    }

    return (
        <div className="mt-1">
            <div className="flex items-center gap-3">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Nombre de la rutina"
                    className="min-w-0 flex-1 border-b border-zinc-700 bg-transparent pb-1.5 text-2xl font-bold text-card-foreground outline-none transition focus:border-b-2 focus:border-indigo-500 md:text-3xl"
                />

                <div className="w-[96px] text-right">
                    {saveState === 'saving' && (
                        <span className="text-xs font-medium text-zinc-400">
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
                </div>
            </div>

            {saveState === 'error' && errorMessage && (
                <p className="mt-1 text-xs text-red-400">{errorMessage}</p>
            )}
        </div>
    )
}