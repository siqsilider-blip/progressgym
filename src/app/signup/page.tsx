import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

export default function SignupPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
            <div className="w-full max-w-sm space-y-8">
                <div className="flex flex-col items-center space-y-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
                        <Dumbbell className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
                    <p className="text-sm text-zinc-400">¿Cómo vas a usar ProgressGym?</p>
                </div>

                <div className="space-y-3">
                    <Link
                        href="/signup/trainer"
                        className="flex w-full flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-indigo-500/50 hover:bg-zinc-900"
                    >
                        <span className="text-2xl">🏋️‍♂️</span>
                        <span className="mt-2 text-base font-semibold">Soy entrenador</span>
                        <span className="mt-0.5 text-xs text-zinc-500">Gestionar alumnos, rutinas y progreso</span>
                    </Link>

                    <Link
                        href="/signup/student"
                        className="flex w-full flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-emerald-500/50 hover:bg-zinc-900"
                    >
                        <span className="text-2xl">💪</span>
                        <span className="mt-2 text-base font-semibold">Soy alumno</span>
                        <span className="mt-0.5 text-xs text-zinc-500">Entrenar, registrar pesos y ver progreso</span>
                    </Link>
                </div>

                <p className="text-center text-sm text-zinc-400">
                    ¿Ya tenés cuenta?{' '}
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        Iniciar sesión
                    </Link>
                </p>
            </div>
        </div>
    )
}
