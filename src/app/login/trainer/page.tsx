import Link from 'next/link'
import { loginTrainer } from '@/app/auth/actions'

export default async function TrainerLoginPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = await props.searchParams
    const message = searchParams?.message

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#07070a] p-5 text-white overflow-hidden">

            {/* Fondo */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[110px] animate-pulse" />
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
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }} />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
                            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black tracking-tight">Progrezzia</h1>
                        <p className="mt-1 text-xs font-medium text-white/35">
                            Acceso entrenadores
                        </p>
                    </div>
                </div>

                {/* Formulario */}
                <div className="rounded-2xl border p-5 mb-5"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>

                    {/* Badge entrenador */}
                    <div className="flex items-center gap-2 mb-5 pb-4 border-b"
                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
                            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                            🏋️‍♂️
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">Soy entrenador</p>
                            <p className="text-[10px] text-white/35">Panel de gestión de alumnos</p>
                        </div>
                    </div>

                    <form className="space-y-4" action={loginTrainer}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-white/50" htmlFor="email">
                                Email
                            </label>
                            <input
                                className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                                id="email"
                                name="email"
                                type="email"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-white/50" htmlFor="password">
                                Contraseña
                            </label>
                            <input
                                className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all"
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
                            className="w-full rounded-xl py-3 text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
                            type="submit"
                        >
                            Iniciar sesión
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="space-y-2 text-center">
                    <p className="text-xs text-white/20">
                        ¿No tenés cuenta?{' '}
                        <Link href="/signup/trainer" className="font-bold text-violet-400 hover:text-violet-300 transition-colors">
                            Registrate gratis
                        </Link>
                    </p>
                    <p>
                        <Link href="/login" className="text-xs text-white/15 hover:text-white/40 transition-colors">
                            ← Volver
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}