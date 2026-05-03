import Link from 'next/link'
import { Dumbbell } from 'lucide-react'
import { signup } from '@/app/auth/actions'

export default async function SignupTrainerPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const message = searchParams?.message

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
            <div className="w-full max-w-sm space-y-8">
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
                        <Dumbbell className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta de entrenador</h1>
                    <p className="text-sm text-zinc-400">
                        Gestioná alumnos, rutinas y progreso
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
                    <form className="space-y-4" action={signup}>
                        <div className="space-y-2">
                            <label
                                className="text-sm font-medium leading-none text-zinc-300"
                                htmlFor="full_name"
                            >
                                Nombre completo
                            </label>
                            <input
                                className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                id="full_name"
                                name="full_name"
                                type="text"
                                placeholder="Juan García"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                className="text-sm font-medium leading-none text-zinc-300"
                                htmlFor="email"
                            >
                                Email
                            </label>
                            <input
                                className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                id="email"
                                name="email"
                                type="email"
                                placeholder="juan@ejemplo.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                className="text-sm font-medium leading-none text-zinc-300"
                                htmlFor="password"
                            >
                                Contraseña
                            </label>
                            <input
                                className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                id="password"
                                name="password"
                                type="password"
                                required
                            />
                        </div>

                        {message && (
                            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                                {Array.isArray(message) ? message[0] : message}
                            </div>
                        )}

                        <button
                            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50"
                            type="submit"
                        >
                            Crear cuenta
                        </button>
                    </form>
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
