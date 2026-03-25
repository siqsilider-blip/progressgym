'use client'

import * as React from 'react'

type Props = {
    exerciseId: string
    isCardio: boolean
    setsCount: number
    weightUnit: string
    defaultReps?: number | null
    initialWeights?: Array<number | string | null | undefined>
    initialReps?: Array<number | string | null | undefined>
}

export default function TrainExerciseTable({
    exerciseId,
    isCardio,
    setsCount,
    weightUnit,
    defaultReps,
    initialWeights,
    initialReps,
}: Props) {
    const handleFirstSetCommit = (field: 'weight' | 'reps', value: string) => {
        for (let i = 1; i < setsCount; i++) {
            const next = document.querySelector(
                `input[name="${field}_${exerciseId}_${i}"]`
            ) as HTMLInputElement | null

            if (!next) continue

            const wasManual = next.dataset.manual === 'true'
            if (wasManual) continue

            next.value = value
            next.dataset.autofilled = 'true'
        }
    }

    const markManual = (
        setIndex: number,
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (setIndex === 0) return
        e.currentTarget.dataset.manual = 'true'
        e.currentTarget.dataset.autofilled = 'false'
    }

    const focusNextInput = (currentInput: HTMLInputElement) => {
        const form = currentInput.form
        if (!form) return

        const allInputs = Array.from(
            form.querySelectorAll<HTMLInputElement>(
                'input[name^="weight_"], input[name^="reps_"]'
            )
        ).filter((input) => !input.disabled && input.type !== 'hidden')

        const currentIndex = allInputs.indexOf(currentInput)
        if (currentIndex === -1) return

        const nextInput = allInputs[currentIndex + 1]
        if (!nextInput) return

        nextInput.focus()

        setTimeout(() => {
            nextInput.select()
        }, 0)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return

        e.preventDefault()

        const input = e.currentTarget
        input.blur()

        requestAnimationFrame(() => {
            focusNextInput(input)
        })
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        const input = e.currentTarget

        requestAnimationFrame(() => {
            input.select()
        })
    }

    return (
        <div className="px-2 py-2 md:px-4 md:py-4">
            <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                <div className="grid grid-cols-[56px_1fr_1fr] border-b border-border bg-muted/60 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid-cols-[72px_1fr_1fr] md:px-4 md:text-[11px]">
                    <div>Serie</div>
                    <div>{isCardio ? 'Tiempo' : `Peso (${weightUnit})`}</div>
                    <div>{isCardio ? 'Nivel / dist.' : 'Reps'}</div>
                </div>

                <div className="divide-y divide-border">
                    {Array.from({ length: setsCount }).map((_, setIndex) => {
                        const initialWeight = initialWeights?.[setIndex]
                        const initialRep = initialReps?.[setIndex]

                        return (
                            <div
                                key={`${exerciseId}-${setIndex}`}
                                className="grid grid-cols-[56px_1fr_1fr] items-center gap-2 px-2 py-2 md:grid-cols-[72px_1fr_1fr] md:gap-3 md:px-4 md:py-3"
                            >
                                <div className="text-sm font-medium text-card-foreground">
                                    {setIndex + 1}
                                </div>

                                <div>
                                    <label
                                        htmlFor={`weight_${exerciseId}_${setIndex}`}
                                        className="sr-only"
                                    >
                                        {isCardio
                                            ? `Tiempo serie ${setIndex + 1}`
                                            : `Peso serie ${setIndex + 1}`}
                                    </label>

                                    <input
                                        id={`weight_${exerciseId}_${setIndex}`}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        inputMode="decimal"
                                        name={`weight_${exerciseId}_${setIndex}`}
                                        defaultValue={initialWeight ?? undefined}
                                        className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground outline-none transition focus:border-indigo-500"
                                        placeholder={isCardio ? '20' : '20'}
                                        onChange={(e) => markManual(setIndex, e)}
                                        onBlur={(e) => {
                                            if (setIndex !== 0) return
                                            handleFirstSetCommit('weight', e.currentTarget.value)
                                        }}
                                        onKeyDown={handleKeyDown}
                                        onFocus={handleFocus}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor={`reps_${exerciseId}_${setIndex}`}
                                        className="sr-only"
                                    >
                                        {isCardio
                                            ? `Nivel o distancia serie ${setIndex + 1}`
                                            : `Repeticiones serie ${setIndex + 1}`}
                                    </label>

                                    <input
                                        id={`reps_${exerciseId}_${setIndex}`}
                                        type="number"
                                        min="0"
                                        inputMode="numeric"
                                        name={`reps_${exerciseId}_${setIndex}`}
                                        defaultValue={initialRep ?? defaultReps ?? undefined}
                                        className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground outline-none transition focus:border-indigo-500"
                                        placeholder={isCardio ? '5' : '12'}
                                        onChange={(e) => markManual(setIndex, e)}
                                        onBlur={(e) => {
                                            if (setIndex !== 0) return
                                            handleFirstSetCommit('reps', e.currentTarget.value)
                                        }}
                                        onKeyDown={handleKeyDown}
                                        onFocus={handleFocus}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}