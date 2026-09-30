import type { Metadata } from 'next'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { acceptStudentInvitation } from './actions'

export const metadata: Metadata = {
    title: 'Activar acceso | Progrezzia',
    robots: {
        index: false,
        follow: false,
    },
}

type InvitationPageProps = {
    searchParams: Promise<{
        token_hash?: string | string[]
        type?: string | string[]
    }>
}

function firstValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value ?? ''
}

export default async function StudentInvitationPage({ searchParams }: InvitationPageProps) {
    const params = await searchParams
    const tokenHash = firstValue(params.token_hash)
    const type = firstValue(params.type)
    const validParams = Boolean(tokenHash && (type === 'signup' || type === 'recovery'))

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070a] p-5 text-white">
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-700/15 blur-[110px]" />
            </div>

            <section className="relative w-full max-w-sm">
                <div className="mb-7 flex flex-col items-center gap-3 text-center">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-2xl bg-violet-600 opacity-60 blur-xl" />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_0_40px_rgba(124,58,237,0.45)]">
                            <LockKeyhole className="h-7 w-7" strokeWidth={2.5} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black tracking-tight">Progrezzia</p>
                        <p className="mt-1 text-sm text-white/45">Tu entrenamiento, en un solo lugar</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.09] to-indigo-500/[0.04] p-5">
                    {validParams ? (
                        <>
                            <h1 className="text-xl font-bold">Activá tu acceso</h1>
                            <p className="mt-2 text-sm leading-relaxed text-white/60">
                                Tu entrenador te invitó a Progrezzia. En el próximo paso vas a elegir tu contraseña y completar una ficha breve.
                            </p>

                            <form action={acceptStudentInvitation} className="mt-5">
                                <input type="hidden" name="token_hash" value={tokenHash} />
                                <input type="hidden" name="type" value={type} />
                                <button
                                    type="submit"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)] transition hover:opacity-90 active:scale-[0.98]"
                                >
                                    Continuar y crear contraseña
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </form>

                            <p className="mt-4 text-center text-[11px] leading-relaxed text-white/35">
                                Este acceso es personal. No lo compartas con otras personas.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-xl font-bold">Enlace incompleto</h1>
                            <p className="mt-2 text-sm leading-relaxed text-white/60">
                                Pedile a tu entrenador que prepare y te envíe una nueva invitación.
                            </p>
                        </>
                    )}
                </div>
            </section>
        </main>
    )
}
