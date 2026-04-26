'use client'

import { useState, useMemo } from 'react'
import { User, Mail, Shield, Moon, Scale, Dumbbell, BarChart2, Bell, Building2, LogOut, Lock, Trash2 } from 'lucide-react'
import { saveSettings, signOutAction } from './actions'
import { type SettingsData } from './types'

type Props = {
    email: string
    theme: 'dark' | 'light'
    initialSettings: SettingsData
}

export default function SettingsClient({ email, theme, initialSettings }: Props) {
    const [settings, setSettings] = useState<SettingsData>(initialSettings)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const isDirty = useMemo(
        () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
        [settings, initialSettings]
    )

    function set<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
        setSettings((prev) => ({ ...prev, [key]: value }))
        setStatus('idle')
    }

    async function handleSave() {
        setSaving(true)
        setStatus('idle')
        try {
            const result = await saveSettings(settings)
            setStatus(result.ok ? 'success' : 'error')
        } catch {
            setStatus('error')
        } finally {
            setSaving(false)
        }
    }

    const isLight = theme === 'light'

    const card = isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
    const labelCls = `mb-1.5 block text-sm font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-200'}`
    const inputCls = `h-11 w-full rounded-xl border px-4 text-sm outline-none transition ${isLight
        ? 'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400'
        : 'border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-500 focus:border-zinc-600'}`
    const selectCls = `h-11 w-full rounded-xl border px-4 text-sm outline-none transition ${isLight
        ? 'border-zinc-200 bg-white text-zinc-900 focus:border-zinc-400'
        : 'border-zinc-800 bg-zinc-950 text-white focus:border-zinc-600'}`
    const iconBox = `flex h-11 w-11 items-center justify-center rounded-xl ${isLight ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-800 text-zinc-300'}`
    const sectionTitle = `text-base font-semibold ${isLight ? 'text-zinc-900' : 'text-white'}`
    const sectionDesc = `mt-0.5 text-sm ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`

    return (
        <div className={`min-h-screen ${isLight ? 'bg-zinc-100' : 'bg-zinc-950'}`} style={{ paddingBottom: 'calc(72px + 4rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-8">
                <div className="mb-6">
                    <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                        Configuración
                    </h1>
                </div>

                <div className="space-y-4">

                    {/* ── Perfil ── */}
                    <Section title="Perfil" desc="Datos de tu cuenta." icon={<User className="h-5 w-5" />} iconBox={iconBox} card={card} sectionTitle={sectionTitle} sectionDesc={sectionDesc}>
                        <div className="mt-5 space-y-4">
                            <div>
                                <label className={`${labelCls} flex items-center gap-2`}>
                                    <Mail className="h-4 w-4 text-zinc-400" /> Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className={`h-11 w-full rounded-xl border px-4 text-sm outline-none ${isLight
                                        ? 'border-zinc-200 bg-zinc-100 text-zinc-500'
                                        : 'border-zinc-800 bg-zinc-800/70 text-zinc-400'}`}
                                />
                                <p className="mt-1 text-xs text-zinc-500">No editable desde acá.</p>
                            </div>

                            <div>
                                <label className={`${labelCls} flex items-center gap-2`}>
                                    <User className="h-4 w-4 text-zinc-400" /> Nombre
                                </label>
                                <input
                                    type="text"
                                    value={settings.name}
                                    onChange={(e) => set('name', e.target.value)}
                                    placeholder="Tu nombre"
                                    className={inputCls}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className={`${labelCls} flex items-center gap-2`}>
                                        <Scale className="h-4 w-4 text-zinc-400" /> Unidad de peso
                                    </label>
                                    <select value={settings.weight_unit} onChange={(e) => set('weight_unit', e.target.value as 'kg' | 'lb')} className={selectCls}>
                                        <option value="kg">Kilogramos (kg)</option>
                                        <option value="lb">Libras (lb)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={`${labelCls} flex items-center gap-2`}>
                                        <Moon className="h-4 w-4 text-zinc-400" /> Apariencia
                                    </label>
                                    <select value={settings.theme} onChange={(e) => set('theme', e.target.value as SettingsData['theme'])} className={selectCls}>
                                        <option value="system">Sistema</option>
                                        <option value="dark">Oscuro</option>
                                        <option value="light">Claro</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* ── Profesional ── */}
                    <Section title="Profesional" desc="Info de tu estudio o servicio." icon={<Building2 className="h-5 w-5" />} iconBox={iconBox} card={card} sectionTitle={sectionTitle} sectionDesc={sectionDesc}>
                        <div className="mt-5 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Nombre del entrenador</label>
                                    <input type="text" value={settings.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="Ej: Martín García" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Nombre del gimnasio</label>
                                    <input type="text" value={settings.gym_name} onChange={(e) => set('gym_name', e.target.value)} placeholder="Ej: FitZone" className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>WhatsApp</label>
                                <input type="tel" value={settings.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+54 9 11 1234-5678" className={inputCls} />
                            </div>
                        </div>
                    </Section>

                    {/* ── Entrenamiento ── */}
                    <Section title="Entrenamiento" desc="Valores por defecto al crear ejercicios." icon={<Dumbbell className="h-5 w-5" />} iconBox={iconBox} card={card} sectionTitle={sectionTitle} sectionDesc={sectionDesc}>
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            <div>
                                <label className={labelCls}>Series por defecto</label>
                                <input type="number" min={1} max={20} value={settings.default_sets} onChange={(e) => set('default_sets', Number(e.target.value))} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Reps por defecto</label>
                                <input type="number" min={1} max={100} value={settings.default_reps} onChange={(e) => set('default_reps', Number(e.target.value))} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Descanso por defecto (s)</label>
                                <input type="number" min={0} max={600} step={15} value={settings.default_rest} onChange={(e) => set('default_rest', Number(e.target.value))} className={inputCls} />
                            </div>
                        </div>
                    </Section>

                    {/* ── Tracking ── */}
                    <Section title="Tracking" desc="Qué mostrar durante el entrenamiento." icon={<BarChart2 className="h-5 w-5" />} iconBox={iconBox} card={card} sectionTitle={sectionTitle} sectionDesc={sectionDesc}>
                        <div className="mt-5 space-y-1">
                            <ToggleRow label="Mostrar PRs" description="Alerta cuando el alumno supera su récord" checked={settings.show_prs} onChange={(v) => set('show_prs', v)} isLight={isLight} />
                            <ToggleRow label="Mostrar gráficos de progreso" description="Gráfico de carga en el historial de ejercicios" checked={settings.show_charts} onChange={(v) => set('show_charts', v)} isLight={isLight} />
                        </div>
                    </Section>

                    {/* ── Notificaciones ── */}
                    <Section title="Notificaciones" desc="Alertas sobre tus alumnos." icon={<Bell className="h-5 w-5" />} iconBox={iconBox} card={card} sectionTitle={sectionTitle} sectionDesc={sectionDesc}>
                        <div className="mt-5 space-y-1">
                            <ToggleRow label="Alumnos inactivos" description="Avisame si un alumno lleva más de 7 días sin entrenar" checked={settings.notify_inactive} onChange={(v) => set('notify_inactive', v)} isLight={isLight} />
                            <ToggleRow label="Riesgo alto" description="Avisame cuando un alumno pasa a nivel de riesgo alto" checked={settings.notify_high_risk} onChange={(v) => set('notify_high_risk', v)} isLight={isLight} />
                        </div>
                    </Section>

                    {/* ── Cuenta ── */}
                    <div className={`rounded-2xl border p-5 ${isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-zinc-900/40'}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className={sectionTitle}>Cuenta</h2>
                                <p className={sectionDesc}>Seguridad y acceso.</p>
                            </div>
                            <div className={iconBox}><Shield className="h-5 w-5" /></div>
                        </div>

                        <div className="mt-5 space-y-2">
                            <button
                                type="button"
                                disabled
                                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition disabled:opacity-40 ${isLight ? 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100' : 'border border-zinc-800 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800'}`}
                            >
                                <Lock className="h-4 w-4 shrink-0 text-zinc-400" />
                                <span className="flex-1 font-medium">Cambiar contraseña</span>
                                <span className={`text-xs ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Próximamente</span>
                            </button>

                            <form action={signOutAction}>
                                <button
                                    type="submit"
                                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${isLight ? 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100' : 'border border-zinc-800 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800'}`}
                                >
                                    <LogOut className="h-4 w-4 shrink-0 text-zinc-400" />
                                    <span className="font-medium">Cerrar sesión</span>
                                </button>
                            </form>

                            <button
                                type="button"
                                disabled
                                className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-left text-sm text-red-500 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400"
                            >
                                <Trash2 className="h-4 w-4 shrink-0" />
                                <span className="flex-1 font-medium">Eliminar cuenta</span>
                                <span className="text-xs opacity-60">Próximamente</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Sticky save bar ── */}
            <div
                className={`fixed left-0 right-0 z-40 border-t px-4 py-3 backdrop-blur-sm ${isLight
                    ? 'border-zinc-200 bg-white/90'
                    : 'border-zinc-800 bg-zinc-950/90'}`}
                style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="mx-auto flex max-w-2xl items-center gap-3">
                    {status === 'success' && (
                        <p className="text-sm font-medium text-emerald-500">
                            ✓ Cambios guardados
                        </p>
                    )}
                    {status === 'error' && (
                        <p className="text-sm font-medium text-red-500">
                            Error al guardar
                        </p>
                    )}
                    <div className="flex-1" />
                    {isDirty && status !== 'success' && (
                        <p className={`text-xs ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Cambios sin guardar
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                        className={`h-10 rounded-xl px-6 text-sm font-semibold transition disabled:opacity-40 ${isLight
                            ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                            : 'bg-white text-black hover:bg-zinc-200'}`}
                    >
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function Section({
    title, desc, icon, iconBox, card, sectionTitle, sectionDesc, children,
}: {
    title: string
    desc: string
    icon: React.ReactNode
    iconBox: string
    card: string
    sectionTitle: string
    sectionDesc: string
    children: React.ReactNode
}) {
    return (
        <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className={sectionTitle}>{title}</h2>
                    <p className={sectionDesc}>{desc}</p>
                </div>
                <div className={iconBox}>{icon}</div>
            </div>
            {children}
        </div>
    )
}

function ToggleRow({
    label, description, checked, onChange, isLight,
}: {
    label: string
    description: string
    checked: boolean
    onChange: (v: boolean) => void
    isLight: boolean
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition ${isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/50'}`}
        >
            <div className="min-w-0">
                <p className={`text-sm font-medium ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{label}</p>
                <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>{description}</p>
            </div>
            <div className="relative shrink-0">
                <div className={`h-6 w-11 rounded-full transition-colors ${checked ? 'bg-indigo-600' : isLight ? 'bg-zinc-200' : 'bg-zinc-700'}`} />
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
        </button>
    )
}
