'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LoginPage() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#07070a] p-5 text-white overflow-hidden">

            <style>{`
                @keyframes breathe {
                    0%, 100% { opacity: 0.18; transform: scale(1); }
                    50% { opacity: 0.28; transform: scale(1.1); }
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-1 { animation: fadeUp 0.5s 0.05s ease both; }
                .fade-2 { animation: fadeUp 0.5s 0.2s ease both; }
                .fade-3 { animation: fadeUp 0.5s 0.35s ease both; }
                .fade-4 { animation: fadeUp 0.5s 0.5s ease both; }
                .glow-anim { animation: breathe 4s ease-in-out infinite; }
            `}</style>

            {/* Fondo atmosférico */}
            <div className="pointer-events-none fixed inset-0">
                <div className="glow-anim absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[110px]" />
                <div className="glow-anim absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-emerald-700/10 blur-[100px]" style={{ animationDelay: '2s' }} />
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
                <div className="fade-1 flex flex-col items-center gap-3 mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-2xl blur-xl opacity-60" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }} />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
                            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black tracking-tight">Progrezzia</h1>
                        <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Elegí tu experiencia
                        </p>
                    </div>
                </div>

                {/* Card Entrenador */}
                <div className="fade-2 mb-3">
                    <Link href="/login/trainer" className="group block w-full rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.06))', borderColor: 'rgba(124,58,237,0.25)', boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
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
                        {/* Mini stats del entrenador */}
                        <div className="mt-3 flex gap-2">
                            {[
                                { n: '12', l: 'alumnos' },
                                { n: '4', l: 'PRs hoy' },
                                { n: '87%', l: 'adherencia' },
                            ].map((s) => (
                                <div key={s.l} className="flex-1 rounded-xl py-1.5 text-center" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.15)' }}>
                                    <p className="text-xs font-black text-violet-300">{s.n}</p>
                                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.l}</p>
                                </div>
                            ))}
                        </div>
                    </Link>
                </div>

                {/* Card Alumno */}
                <div className="fade-3 mb-7">
                    <Link href="/login/student" className="group block w-full rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))', borderColor: 'rgba(16,185,129,0.2)', boxShadow: '0 4px 24px rgba(16,185,129,0.06)' }}>
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.25)' }}>
                                💪
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white">Soy alumno</p>
                                <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Entrenás, registrás pesos y seguís tu progreso
                                </p>
                            </div>
                            <svg className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'rgba(52,211,153,0.6)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                        {/* Mini preview del alumno */}
                        <div className="mt-3 flex gap-2 items-center">
                            <div className="flex-1 rounded-xl py-1.5 px-2.5" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Racha</p>
                                    <p className="text-xs font-black text-emerald-400">🔥 14d</p>
                                </div>
                                <div className="h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div className="h-full rounded-full bg-emerald-400" style={{ width: '70%' }} />
                                </div>
                            </div>
                            <div className="flex-1 rounded-xl py-1.5 px-2.5" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <p className="text-[9px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Mejor PR</p>
                                <p className="text-xs font-black text-emerald-400">+15 kg</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Footer */}
                <div className="fade-4 text-center">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        ¿No tenés cuenta?{' '}
                        <Link href="/signup" className="font-bold text-violet-400 hover:text-violet-300 transition-colors">
                            Registrate gratis
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}