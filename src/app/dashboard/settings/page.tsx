import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Mail, Shield, Moon, Scale } from 'lucide-react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function SettingsPage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const message = searchParams?.message

    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'
    const isLight = theme === 'light'

    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    return (
        <div
            className={`min-h-screen ${isLight ? 'bg-zinc-100' : 'bg-zinc-950'
                }`}
        >
            <div className="mx-auto w-full max-w-4xl px-6 py-8 md:px-8 md:py-10">
                <div className="mb-8">
                    <h1
                        className={`text-3xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'
                            }`}
                    >
                        Settings
                    </h1>
                    <p
                        className={`mt-2 text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                            }`}
                    >
                        Administrá la información de tu cuenta y tu perfil.
                    </p>
                </div>

                {message === 'success' && (
                    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        Cambios guardados correctamente.
                    </div>
                )}

                {message === 'error' && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Hubo un error al guardar los cambios.
                    </div>
                )}

                <div className="grid gap-6">
                    <div
                        className={`rounded-2xl border p-6 shadow-sm ${isLight
                            ? 'border-zinc-200 bg-white'
                            : 'border-zinc-800 bg-zinc-900/60'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    className={`text-lg font-semibold ${isLight ? 'text-zinc-900' : 'text-white'
                                        }`}
                                >
                                    Perfil
                                </h2>
                                <p
                                    className={`mt-1 text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                                        }`}
                                >
                                    Estos datos se usan para identificarte dentro de la app.
                                </p>
                            </div>

                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl ${isLight
                                    ? 'bg-zinc-100 text-zinc-600'
                                    : 'bg-zinc-800 text-zinc-300'
                                    }`}
                            >
                                <User className="h-5 w-5" />
                            </div>
                        </div>

                        <form
                            action="/dashboard/settings/update"
                            method="POST"
                            className="mt-6 space-y-5"
                        >
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label
                                        className={`mb-2 flex items-center gap-2 text-sm font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-200'
                                            }`}
                                    >
                                        <Mail className="h-4 w-4 text-zinc-400" />
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        value={user.email ?? ''}
                                        disabled
                                        className={`h-12 w-full rounded-xl border px-4 text-sm outline-none ${isLight
                                            ? 'border-zinc-200 bg-zinc-100 text-zinc-500'
                                            : 'border-zinc-800 bg-zinc-800/70 text-zinc-400'
                                            }`}
                                    />

                                    <p
                                        className={`mt-2 text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-500'
                                            }`}
                                    >
                                        El email no se puede editar desde acá.
                                    </p>
                                </div>

                                <div className="md:col-span-2">
                                    <label
                                        className={`mb-2 flex items-center gap-2 text-sm font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-200'
                                            }`}
                                    >
                                        <User className="h-4 w-4 text-zinc-400" />
                                        Nombre
                                    </label>

                                    <input
                                        name="name"
                                        defaultValue={profile?.name ?? ''}
                                        placeholder="Tu nombre"
                                        className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition ${isLight
                                            ? 'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400'
                                            : 'border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-500 focus:border-zinc-600'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label
                                        className={`mb-2 flex items-center gap-2 text-sm font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-200'
                                            }`}
                                    >
                                        <Scale className="h-4 w-4 text-zinc-400" />
                                        Unidad de peso
                                    </label>

                                    <select
                                        name="weight_unit"
                                        defaultValue={profile?.weight_unit ?? 'kg'}
                                        className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition ${isLight
                                            ? 'border-zinc-200 bg-white text-zinc-900 focus:border-zinc-400'
                                            : 'border-zinc-800 bg-zinc-950 text-white focus:border-zinc-600'
                                            }`}
                                    >
                                        <option value="kg">Kilogramos (kg)</option>
                                        <option value="lb">Libras (lb)</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        className={`mb-2 flex items-center gap-2 text-sm font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-200'
                                            }`}
                                    >
                                        <Moon className="h-4 w-4 text-zinc-400" />
                                        Apariencia
                                    </label>

                                    <select
                                        name="theme"
                                        defaultValue={profile?.theme ?? 'dark'}
                                        className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition ${isLight
                                            ? 'border-zinc-200 bg-white text-zinc-900 focus:border-zinc-400'
                                            : 'border-zinc-800 bg-zinc-950 text-white focus:border-zinc-600'
                                            }`}
                                    >
                                        <option value="dark">Oscuro</option>
                                        <option value="light">Claro</option>
                                    </select>
                                </div>
                            </div>

                            <div
                                className={`flex items-center justify-end border-t pt-5 ${isLight ? 'border-zinc-200' : 'border-zinc-800'
                                    }`}
                            >
                                <button
                                    type="submit"
                                    className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${isLight
                                        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                                        : 'bg-white text-black hover:bg-zinc-200'
                                        }`}
                                >
                                    Guardar cambios
                                </button>
                            </div>
                        </form>
                    </div>

                    <div
                        className={`rounded-2xl border p-6 ${isLight
                            ? 'border-zinc-200 bg-white'
                            : 'border-zinc-800 bg-zinc-900/40'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    className={`text-lg font-semibold ${isLight ? 'text-zinc-900' : 'text-white'
                                        }`}
                                >
                                    Cuenta
                                </h2>
                                <p
                                    className={`mt-1 text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                                        }`}
                                >
                                    Más adelante podemos sumar cambio de contraseña y más preferencias.
                                </p>
                            </div>

                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl ${isLight
                                    ? 'bg-zinc-100 text-zinc-600'
                                    : 'bg-zinc-800 text-zinc-300'
                                    }`}
                            >
                                <Shield className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}