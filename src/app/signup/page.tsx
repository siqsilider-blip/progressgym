'use client'

import Link from 'next/link'

export default function SignupPage() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#07070a] p-5 text-white overflow-hidden">

            {/* Fondo atmosférico */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[110px]" />
                <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-emerald-700/10 blur-[100px]" />
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
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
                            📈
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black tracking-tight">Crear cuenta</h1>
                        <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            ¿Cómo vas a usar Progrezzia?
                        </p>
                    </div>
                </div>

                {/* Card Entrenador */}
                <div className="mb-3">
                    <Link href="/signup/trainer" className="group block w-full rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.06))', borderColor: 'rgba(124,58,237,0.25)', boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                                style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                                🏋️‍♂️
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white">Soy entrenador</p>
                                <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Gestioná alumnos, rutinas y progreso
                                </p>
                            </div>
                            <svg className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'rgba(167,139,250,0.6)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>
                </div>

                {/* Card Alumno */}
                <div className="mb-7">
                    <Link href="/signup/student" className="group block w-full rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))', borderColor: 'rgba(16,185,129,0.2)', boxShadow: '0 4px 24px rgba(16,185,129,0.06)' }}>
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                                style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.25)' }}>
                                💪
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white">Soy alumno</p>
                                <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Entrenás, registrás pesos y ves tu progreso
                                </p>
                            </div>
                            <svg className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'rgba(52,211,153,0.6)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        ¿Ya tenés cuenta?{' '}
                        <Link href="/login" className="font-bold text-violet-400 hover:text-violet-300 transition-colors">
                            Iniciar sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
