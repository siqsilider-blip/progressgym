'use client'

import * as React from 'react'
import { ExternalLink, PlayCircle, X } from 'lucide-react'

type Props = {
    exerciseName: string
    videoUrl: string
    instructions?: string | null
}

type VideoSource =
    | { kind: 'youtube'; url: string }
    | { kind: 'file'; url: string }
    | { kind: 'external'; url: string }

function getVideoSource(rawUrl: string): VideoSource {
    try {
        const url = new URL(rawUrl)
        const hostname = url.hostname.replace(/^www\./, '').toLowerCase()
        let youtubeId: string | null = null

        if (hostname === 'youtu.be') {
            youtubeId = url.pathname.split('/').filter(Boolean)[0] ?? null
        } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
            if (url.pathname === '/watch') youtubeId = url.searchParams.get('v')
            if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/')) {
                youtubeId = url.pathname.split('/').filter(Boolean)[1] ?? null
            }
        }

        if (youtubeId && /^[A-Za-z0-9_-]{6,}$/.test(youtubeId)) {
            return {
                kind: 'youtube',
                url: `https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&rel=0`,
            }
        }

        if (/\.(mp4|webm|ogg|mov)$/i.test(url.pathname)) {
            return { kind: 'file', url: url.toString() }
        }

        return { kind: 'external', url: url.toString() }
    } catch {
        return { kind: 'external', url: rawUrl }
    }
}

export default function ExerciseDemo({ exerciseName, videoUrl, instructions }: Props) {
    const [open, setOpen] = React.useState(false)
    const titleId = React.useId()
    const source = React.useMemo(() => getVideoSource(videoUrl), [videoUrl])

    React.useEffect(() => {
        if (!open) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false)
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [open])

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-400 transition active:scale-[0.98] hover:bg-indigo-500/20"
            >
                <PlayCircle className="h-5 w-5" aria-hidden="true" />
                Ver cómo se hace
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setOpen(false)
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-indigo-400">Demostración</p>
                                <h2 id={titleId} className="truncate text-lg font-bold text-foreground">
                                    {exerciseName}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Cerrar demostración"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition active:scale-95 hover:bg-muted"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="space-y-4 p-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}>
                            {source.kind === 'youtube' ? (
                                <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                                    <iframe
                                        src={source.url}
                                        title={`Demostración de ${exerciseName}`}
                                        className="h-full w-full"
                                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            ) : source.kind === 'file' ? (
                                <video
                                    src={source.url}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="aspect-video w-full rounded-2xl bg-black object-contain"
                                >
                                    Tu dispositivo no puede reproducir este video.
                                </video>
                            ) : (
                                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                                    <PlayCircle className="mx-auto h-10 w-10 text-indigo-400" aria-hidden="true" />
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Este video se abre en su sitio original.
                                    </p>
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                                    >
                                        Abrir demostración
                                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                    </a>
                                </div>
                            )}

                            {instructions?.trim() && (
                                <div className="rounded-2xl border border-border bg-card p-4">
                                    <h3 className="text-sm font-semibold text-foreground">Indicaciones del entrenador</h3>
                                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                                        {instructions.trim()}
                                    </p>
                                </div>
                            )}

                            <p className="text-center text-xs leading-5 text-muted-foreground">
                                Mirá el movimiento antes de empezar. Podés pausar y volver a verlo cuando lo necesites.
                            </p>
                        </div>
                    </section>
                </div>
            )}
        </>
    )
}
