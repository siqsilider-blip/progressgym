'use client'

import * as React from 'react'

export default function WorkoutRestTimer() {
    const [timeLeft, setTimeLeft] = React.useState(0)
    const [isRunning, setIsRunning] = React.useState(false)
    const [baseSeconds, setBaseSeconds] = React.useState(60)
    const [flashDone, setFlashDone] = React.useState(false)

    React.useEffect(() => {
        const handleStart = (event: Event) => {
            const customEvent = event as CustomEvent<{ seconds?: number }>
            const seconds = customEvent.detail?.seconds ?? 60

            setBaseSeconds(seconds)
            setTimeLeft(seconds)
            setIsRunning(true)
            setFlashDone(false)
        }

        window.addEventListener(
            'progressgym:start-rest-timer',
            handleStart as EventListener
        )

        return () => {
            window.removeEventListener(
                'progressgym:start-rest-timer',
                handleStart as EventListener
            )
        }
    }, [])

    React.useEffect(() => {
        if (!isRunning || timeLeft <= 0) return

        const interval = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    window.clearInterval(interval)
                    setIsRunning(false)
                    setFlashDone(true)

                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        navigator.vibrate(300)
                    }

                    window.setTimeout(() => {
                        setFlashDone(false)
                    }, 1200)

                    return 0
                }

                return prev - 1
            })
        }, 1000)

        return () => window.clearInterval(interval)
    }, [isRunning, timeLeft])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div
            className={`rounded-2xl border px-4 py-3 transition ${flashDone
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                    : 'border-border bg-card'
                }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Descanso
                    </p>

                    <p className="mt-1 text-2xl font-bold text-card-foreground">
                        {timeLeft > 0 ? formatTime(timeLeft) : formatTime(baseSeconds)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        {timeLeft > 0
                            ? 'Corriendo'
                            : flashDone
                                ? 'Listo para la próxima serie'
                                : 'Esperando una serie completada'}
                    </p>
                </div>

                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={() => setTimeLeft((prev) => prev + 15)}
                        className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                    >
                        +15s
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setTimeLeft(baseSeconds)
                            setIsRunning(false)
                            setFlashDone(false)
                        }}
                        className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                    >
                        Reiniciar
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsRunning((prev) => !prev)}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                    >
                        {isRunning ? 'Pausar' : 'Seguir'}
                    </button>
                </div>
            </div>
        </div>
    )
}