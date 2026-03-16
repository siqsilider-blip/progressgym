import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { saveTrainerProfile } from './actions'
import { getTrainerProfile } from '@/lib/getTrainerProfile'

export default async function SettingsPage() {
    const supabase = await createClient()

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    const profile = await getTrainerProfile()

    return (
        <div className="p-8 text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    Configuración de tu cuenta y preferencias.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-lg font-semibold">Cuenta</h2>

                    <div className="mt-4 space-y-3 text-sm">
                        <div>
                            <span className="text-zinc-400">Email</span>
                            <div className="text-zinc-100">{user.email}</div>
                        </div>

                        <div>
                            <span className="text-zinc-400">User ID</span>
                            <div className="break-all text-zinc-500">{user.id}</div>
                        </div>
                    </div>
                </div>

                <form
                    action={saveTrainerProfile}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
                >
                    <h2 className="text-lg font-semibold">Perfil profesional</h2>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label
                                htmlFor="display_name"
                                className="text-sm text-zinc-400"
                            >
                                Nombre visible
                            </label>
                            <input
                                id="display_name"
                                name="display_name"
                                type="text"
                                defaultValue={profile?.display_name ?? ''}
                                placeholder="Tu nombre"
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="gym_name"
                                className="text-sm text-zinc-400"
                            >
                                Nombre del gimnasio
                            </label>
                            <input
                                id="gym_name"
                                name="gym_name"
                                type="text"
                                defaultValue={profile?.gym_name ?? ''}
                                placeholder="Ej: Progress Gym"
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="weight_unit"
                                className="text-sm text-zinc-400"
                            >
                                Unidad de peso
                            </label>
                            <select
                                id="weight_unit"
                                name="weight_unit"
                                defaultValue={profile?.weight_unit ?? 'kg'}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
                            >
                                <option value="kg">kg</option>
                                <option value="lb">lb</option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="default_routine_days"
                                className="text-sm text-zinc-400"
                            >
                                Días de rutina por defecto
                            </label>
                            <select
                                id="default_routine_days"
                                name="default_routine_days"
                                defaultValue={String(profile?.default_routine_days ?? 4)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
                            >
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                                <option value="6">6</option>
                            </select>
                        </div>

                        <button className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">
                            Guardar cambios
                        </button>
                    </div>
                </form>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-lg font-semibold">Marca</h2>

                    <p className="mt-2 text-sm text-zinc-400">
                        Próximamente vas a poder personalizar tu app.
                    </p>

                    <ul className="mt-3 list-disc pl-5 text-sm text-zinc-500">
                        <li>Logo del entrenador</li>
                        <li>Color principal</li>
                        <li>Modo claro / oscuro</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}