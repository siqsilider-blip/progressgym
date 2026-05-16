import { loginStudent } from '@/app/auth/actions'

export default async function StudentLoginPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = await props.searchParams
    const message = searchParams?.message

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#07070a] p-5 text-white overflow-hidden">

            {/* Fondo atmosférico */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-700/15 blur-[110px]" />
                <svg className="absolute inset-0 w-full h-full opacity-[0.025]">
                    <defs>
                        <pattern id="g" width="45" height="45" patternUnits="userSpaceOnUse">
                            <path d="M 45 0 L 0 0 0 45" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#g)" />
                </svg>
            </div>

            <div className="relative w-full max-w-xs">

                {/* Logo */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }} />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 40px rgba(16,185,129,0.45)' }}>
                            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black tracking-tight">Progrezzia</h1>
                        <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Acceso alumnos
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div className="rounded-2xl border p-5 mb-4"
                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))', borderColor: 'rgba(16,185,129,0.2)' }}>

                    {/* Badge */}
                    <div className="flex items-center gap-2.5 mb-5 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
                            style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.25)' }}>
                            💪
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">Soy alumno</p>
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Registrá tu entrenamiento de hoy</p>
                        </div>
                    </div>

                    <form className="space-y-4" action={loginStudent}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }} htmlFor="email">
                                Email
                            </label>
                            <input
                                className="w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-emerald-500/60"
                                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                                id="email"
                                name="email"
                                type="email"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }} htmlFor="password">
                                Contraseña
                            </label>
                            <input
                                className="w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-emerald-500/60"
                                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
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
                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}
                            type="submit"
                        >
                            Iniciar sesión
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="space-y-2 text-center">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        ¿No tenés cuenta?{' '}
                        <a href="/signup/student" className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors">Registrate gratis</a>
                    </p>
                    <p>
                        <a href="/login" className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.15)' }}>← Volver</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
