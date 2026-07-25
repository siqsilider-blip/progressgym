import { requestPasswordReset } from '@/app/auth/actions'

export default async function ForgotPasswordPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = await props.searchParams
    const message = searchParams?.message
    const sent = searchParams?.sent === '1'

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#07070a] p-5 text-white overflow-hidden">
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-700/15 blur-[110px]" />
            </div>

            <div className="relative w-full max-w-xs">
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }} />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 40px rgba(124,58,237,0.45)' }}>
                            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black tracking-tight">Progrezzia</h1>
                        <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Recuperar contraseña
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border p-5 mb-4"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.04))', borderColor: 'rgba(124,58,237,0.2)' }}>

                    {sent ? (
                        <div className="text-center py-2">
                            <p className="text-sm font-semibold text-white mb-1">
                                Revisá tu email 📩
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                Si existe una cuenta con ese email, te mandamos un link para crear una contraseña nueva.
                            </p>
                        </div>
                    ) : (
                        <form className="space-y-4" action={requestPasswordReset}>
                            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                Ingresá el email de tu cuenta (entrenador o alumno) y te mandamos un link para restablecer tu contraseña.
                            </p>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }} htmlFor="email">
                                    Email
                                </label>
                                <input
                                    className="w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-indigo-500/60"
                                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    required
                                />
                            </div>

                            {message && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                                    {String(message)}
                                </div>
                            )}

                            <button
                                className="w-full rounded-xl py-3 text-sm font-black text-white transition-all hover:opacity-90 active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
                                type="submit"
                            >
                                Enviar link de recuperación
                            </button>
                        </form>
                    )}
                </div>

                <div className="space-y-2 text-center">
                    <p>
                        <a href="/login/trainer" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                            ← Volver al login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
