import Link from 'next/link'
import { login } from '@/app/auth/actions'
import { ProgrezziaLogo } from '@/components/ProgrezziaBrand'
import LoginButton from './LoginButton'

const fieldClass = 'min-h-12 w-full rounded-xl border border-[#55454a] bg-[#191719] px-4 text-base text-[#f5f2ee] outline-none focus:border-[#c98796] focus:ring-2 focus:ring-[#c98796]/35'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string | string[] }>
}) {
    const { message } = await searchParams

    return (
        <main className="flex min-h-dvh flex-col items-center justify-center bg-[#111111] px-6 py-10 text-[#f5f2ee]">
            <div className="w-full max-w-sm">
                <h1 className="mx-auto mb-8 max-w-[9.5rem] sm:max-w-[11rem]">
                    <ProgrezziaLogo />
                </h1>

                <form action={login} className="space-y-4">
                    {typeof message === 'string' && message && (
                        <p role="status" className="break-words border-l-2 border-[#c98796] bg-[#21191c] px-3 py-2.5 text-sm text-[#f5f2ee]">
                            {message}
                        </p>
                    )}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium" htmlFor="email">Email</label>
                        <input
                            className={fieldClass}
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            autoCapitalize="none"
                            spellCheck={false}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium" htmlFor="password">Contraseña</label>
                        <input
                            className={fieldClass}
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <LoginButton />
                </form>

                <Link href="/forgot-password" className="mt-1.5 flex min-h-11 items-center justify-center rounded-md text-sm font-medium text-[#e9a0ad] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#e9a0ad]">
                    ¿Olvidaste tu contraseña?
                </Link>

                <footer className="mt-4 border-t border-[#3d3336] pt-4 text-center text-sm">
                    <p className="text-[#c6bdc0]">Si sos alumno, activá tu cuenta desde la invitación de tu entrenador.</p>
                    <Link href="/signup/trainer" className="inline-flex min-h-11 items-center rounded-md font-medium text-[#e9a0ad] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#e9a0ad]">
                        Crear cuenta de entrenador
                    </Link>
                </footer>
            </div>
        </main>
    )
}
