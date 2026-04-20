'use client'

import * as React from 'react'

type Props = {
    exerciseId: string
    isCardio: boolean
    setsCount: number
    weightUnit: string
    restSeconds: number
    defaultReps?: number | null
    initialWeights?: Array<number | string | null | undefined>
    initialReps?: Array<number | string | null | undefined>
}

type SetRow = {
    weight: string
    reps: string
    manualWeight: boolean
    manualReps: boolean
    committed: boolean
}

function normalizeValue(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return ''
    return String(value)
}

function isRowComplete(row: { weight: string; reps: string }) {
    return Boolean(row.weight.trim() && row.reps.trim())
}

export default function TrainExerciseTable({
    exerciseId,
    isCardio,
    setsCount,
    weightUnit,
    restSeconds,
    defaultReps,
    initialWeights,
    initialReps,
}: Props) {
    const buildInitialRows = React.useCallback((): SetRow[] => {
        return Array.from({ length: setsCount }, (_, index) => {
            const weight = normalizeValue(initialWeights?.[index])
            const reps = normalizeValue(
                initialReps?.[index] ?? (index === 0 ? defaultReps : undefined)
            )

            return {
                weight,
                reps,
                manualWeight: false,
                manualReps: false,
                committed: isRowComplete({ weight, reps }),
            }
        })
    }, [setsCount, initialWeights, initialReps, defaultReps])

    const [rows, setRows] = React.useState<SetRow[]>(buildInitialRows)

    React.useEffect(() => {
        setRows(buildInitialRows())
    }, [buildInitialRows])

    const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})

    const setInputRef =
        (key: string) =>
            (element: HTMLInputElement | null): void => {
                inputRefs.current[key] = element
            }

    const triggerGlobalRestTimer = React.useCallback(() => {
        if (typeof window === 'undefined') return

        window.dispatchEvent(
            new CustomEvent('progressgym:start-rest-timer', {
                detail: {
                    seconds: restSeconds > 0 ? restSeconds : 60,
                },
            })
        )
    }, [restSeconds])

    const doneSets = React.useMemo(
        () => rows.map((row) => row.committed && isRowComplete(row)),
        [rows]
    )

    const activeSet = React.useMemo(() => {
        const firstIncomplete = rows.findIndex(
            (row) => !(row.committed && isRowComplete(row))
        )
        return firstIncomplete === -1 ? Math.max(setsCount - 1, 0) : firstIncomplete
    }, [rows, setsCount])

    const focusInput = React.useCallback((setIndex: number, field: 'weight' | 'reps') => {
        const key = `${field}-${setIndex}`
        const input = inputRefs.current[key]
        if (!input) return

        input.focus()

        requestAnimationFrame(() => {
            try {
                input.select()
            } catch { }
        })
    }, [])

    const focusNextInput = React.useCallback(
        (setIndex: number, field: 'weight' | 'reps') => {
            if (field === 'weight') {
                focusInput(setIndex, 'reps')
                return
            }

            if (setIndex + 1 < setsCount) {
                focusInput(setIndex + 1, 'weight')
            }
        },
        [focusInput, setsCount]
    )

    const handleAutofillFromFirstSet = React.useCallback(
        (field: 'weight' | 'reps', value: string) => {
            if (!value.trim()) return

            setRows((prev) =>
                prev.map((row, index) => {
                    if (index === 0) return row

                    if (field === 'weight') {
                        if (row.manualWeight) return row
                        return { ...row, weight: value }
                    }

                    if (row.manualReps) return row
                    return { ...row, reps: value }
                })
            )
        },
        []
    )

    const updateField = React.useCallback(
        (setIndex: number, field: 'weight' | 'reps', value: string) => {
            setRows((prev) => {
                const next = [...prev]
                const current = prev[setIndex]

                next[setIndex] =
                    field === 'weight'
                        ? {
                            ...current,
                            weight: value,
                            manualWeight: setIndex === 0 ? current.manualWeight : true,
                            committed: false,
                        }
                        : {
                            ...current,
                            reps: value,
                            manualReps: setIndex === 0 ? current.manualReps : true,
                            committed: false,
                        }

                return next
            })
        },
        []
    )

    const commitRow = React.useCallback(
        (setIndex: number, field: 'weight' | 'reps') => {
            let shouldStartTimer = false
            let shouldMoveNext = false

            setRows((prev) => {
                const next = [...prev]
                const current = prev[setIndex]
                const wasCommitted = current.committed
                const nowComplete = isRowComplete(current)

                if (setIndex === 0) {
                    const value = current[field]
                    if (value.trim()) {
                        for (let i = 1; i < next.length; i++) {
                            const row = next[i]

                            if (field === 'weight') {
                                if (!row.manualWeight) {
                                    next[i] = { ...row, weight: value }
                                }
                            } else {
                                if (!row.manualReps) {
                                    next[i] = { ...row, reps: value }
                                }
                            }
                        }
                    }
                }

                if (nowComplete) {
                    next[setIndex] = {
                        ...next[setIndex],
                        committed: true,
                    }

                    if (!wasCommitted) {
                        shouldStartTimer = true
                        shouldMoveNext = field === 'reps'
                    }
                }

                return next
            })

            if (shouldStartTimer) {
                queueMicrotask(() => {
                    triggerGlobalRestTimer()

                    if (shouldMoveNext && setIndex + 1 < setsCount) {
                        focusInput(setIndex + 1, 'weight')
                    }
                })
            }
        },
        [focusInput, setsCount, triggerGlobalRestTimer]
    )

    const handleKeyDown = React.useCallback(
        (
            e: React.KeyboardEvent<HTMLInputElement>,
            setIndex: number,
            field: 'weight' | 'reps'
        ) => {
            if (e.key !== 'Enter') return
            e.preventDefault()

            commitRow(setIndex, field)

            if (field === 'weight') {
                focusInput(setIndex, 'reps')
            }
        },
        [commitRow, focusInput]
    )

    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        const input = e.currentTarget

        setTimeout(() => {
            try {
                input.select()
            } catch { }
        }, 0)
    }, [])

    return (
        <div className="px-2 py-3 md:px-4">
            <div className="space-y-2">
                {rows.map((row, setIndex) => {
                    const isDone = doneSets[setIndex]
                    const isActive = activeSet === setIndex

                    return (
                        <div
                            key={`${exerciseId}-${setIndex}`}
                            className={`flex items-center gap-2 rounded-xl border p-2 transition ${isDone
                                    ? 'border-green-300 bg-green-50 dark:bg-green-500/10'
                                    : isActive
                                        ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10'
                                        : 'border-border bg-muted/30'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={isDone}
                                readOnly
                                className="h-4 w-4"
                            />

                            <div className="w-8 text-sm font-medium">S{setIndex + 1}</div>

                            <input
                                ref={setInputRef(`weight-${setIndex}`)}
                                type="number"
                                step="0.01"
                                min="0"
                                inputMode="decimal"
                                name={`weight_${exerciseId}_${setIndex}`}
                                value={row.weight}
                                placeholder={isCardio ? '20' : weightUnit}
                                className="h-10 w-full rounded-lg border border-border bg-input px-2 text-sm"
                                onChange={(e) =>
                                    updateField(setIndex, 'weight', e.currentTarget.value)
                                }
                                onBlur={() => commitRow(setIndex, 'weight')}
                                onKeyDown={(e) => handleKeyDown(e, setIndex, 'weight')}
                                onFocus={handleFocus}
                            />

                            <input
                                ref={setInputRef(`reps-${setIndex}`)}
                                type="number"
                                min="0"
                                inputMode="numeric"
                                name={`reps_${exerciseId}_${setIndex}`}
                                value={row.reps}
                                placeholder={isCardio ? 'min' : 'reps'}
                                className="h-10 w-full rounded-lg border border-border bg-input px-2 text-sm"
                                onChange={(e) =>
                                    updateField(setIndex, 'reps', e.currentTarget.value)
                                }
                                onBlur={() => commitRow(setIndex, 'reps')}
                                onKeyDown={(e) => handleKeyDown(e, setIndex, 'reps')}
                                onFocus={handleFocus}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}