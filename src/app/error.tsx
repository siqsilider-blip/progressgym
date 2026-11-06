'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCw } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[GlobalError]', error)
    }, [error])

    return (
        <main className="mx-auto flex min-h-[60dvh] max-w-lg items-center px-4 py-8">
            <section className="w-full rounded-2xl border border-amber-500/25 bg-card p-5 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                    <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </span>
                <h1 className="mt-4 text-xl font-black text-foreground">No pudimos cargar esta pantalla</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Tus datos no se modificaron. Revisá la conexión e intentá nuevamente.
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                >
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    Reintentar
                </button>
                <Link href="/" className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-secondary px-4 text-sm font-semibold text-foreground">
                    Ir al inicio
                </Link>
            </section>
        </main>
    )
}
