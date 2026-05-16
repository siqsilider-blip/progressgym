'use client'

import * as React from 'react'

export default function WorkoutRestTimer() {
    const [timeLeft, setTimeLeft] = React.useState(0)
    const [isRunning, setIsRunning] = React.useState(false)
    const [baseSeconds, setBaseSeconds] = React.useState(60)
    const [flashDone, setFlashDone] = React.useState(false)

    const endTimeRef = React.useRef<number | null>(null)
    const audioContextRef = React.useRef<AudioContext | null>(null)
    const audioSourceRef = React.useRef<AudioBufferSourceNode | null>(null)

    function startSilentAudio() {
        try {
            const ctx = new AudioContext()
            const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate)
            const source = ctx.createBufferSource()
            source.buffer = buffer
            source.loop = true
            source.connect(ctx.destination)
            source.start()
            audioContextRef.current = ctx
            audioSourceRef.current = source
        } catch (e) {
            console.log('Audio context not available:', e)
        }
    }

    function stopSilentAudio() {
        try {
            audioSourceRef.current?.stop()
            audioContextRef.current?.close()
            audioContextRef.current = null
            audioSourceRef.current = null
        } catch (e) {}
    }

    function setupMediaSession(totalSeconds: number) {
        if (!('mediaSession' in navigator)) return

        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Descanso activo',
            artist: 'ProgressGym',
            album: `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')} min`,
        })

        navigator.mediaSession.setActionHandler('pause', () => {
            setIsRunning(false)
        })

        navigator.mediaSession.setActionHandler('play', () => {
            setIsRunning(true)
        })
    }

    React.useEffect(() => {
        const handleStart = (event: Event) => {
            const customEvent = event as CustomEvent<{ seconds?: number }>
            const seconds = customEvent.detail?.seconds ?? 60

            endTimeRef.current = Date.now() + seconds * 1000
            if (Notification.permission === 'default') {
                Notification.requestPermission()
            }

            setBaseSeconds(seconds)
            setTimeLeft(seconds)
            setIsRunning(true)
            setFlashDone(false)
            startSilentAudio()
            setupMediaSession(seconds)
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
            stopSilentAudio()
        }
    }, [])

    React.useEffect(() => {
        if (!isRunning || timeLeft <= 0) return

        // Re-anchor end time on every start/resume based on current timeLeft
        endTimeRef.current = Date.now() + timeLeft * 1000

        const interval = window.setInterval(() => {
            if (endTimeRef.current === null) return
            const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000)
            if (remaining <= 0) {
                window.clearInterval(interval)
                setIsRunning(false)
                setTimeLeft(0)
                setFlashDone(true)

                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate(300)
                }
                if (Notification.permission === 'granted') {
                    new Notification('¡Descanso terminado!', {
                        body: 'Es hora de la próxima serie 💪',
                        icon: '/icon.png',
                    })
                }

                window.setTimeout(() => setFlashDone(false), 1200)
                return
            }
            setTimeLeft(remaining)
        }, 250)

        return () => window.clearInterval(interval)
    }, [isRunning])

    // Stop silent audio whenever the timer stops (end or pause)
    React.useEffect(() => {
        if (!isRunning) {
            stopSilentAudio()
        }
    }, [isRunning])

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
                        onClick={() => {
                            if (endTimeRef.current !== null) endTimeRef.current += 15000
                            setTimeLeft((prev) => prev + 15)
                        }}
                        className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
                    >
                        +15s
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            endTimeRef.current = null
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
