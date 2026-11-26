'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { User, Mail, Shield, Scale, Dumbbell, BarChart2, Building2, LogOut, Lock } from 'lucide-react'
import { saveSettings, signOutAction } from './actions'
import { type SettingsData } from './types'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import AccountDeletionCard from '@/components/account/AccountDeletionCard'

type Props = {
    email: string
    appearance: React.ReactNode
    initialSettings: SettingsData
}

const card = 'rounded-xl border border-border bg-card p-4'
const labelCls = 'mb-1.5 block text-sm font-medium text-foreground'
const inputCls = 'h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring'
const iconBox = 'flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground'
const sectionTitle = 'text-sm font-semibold text-foreground'
const sectionDesc = 'mt-0.5 text-xs text-muted-foreground'
const accountControl = 'flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left text-sm text-foreground transition hover:bg-muted'

export default function SettingsClient({ email, appearance, initialSettings }: Props) {
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

    return (
        <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(72px + 4rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 md:px-6 md:py-6 xl:px-8">
                <DashboardPageHeader
                    title="Configuración"
                    subtitle="Preferencias de tu cuenta"
                    backHref="/dashboard"
                />

                {appearance}

                <div className="grid gap-4 xl:grid-cols-2 xl:items-start">

                    {/* ── Perfil ── */}
                    <Section title="Perfil" desc="Datos de tu cuenta." icon={<User className="h-5 w-5" />}>
                        <div className="mt-5 space-y-4">
                            <div>
                                <label className={`${labelCls} flex items-center gap-2`}>
                                    <Mail className="h-4 w-4 text-muted-foreground" /> Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-muted-foreground outline-none"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">No editable desde acá.</p>
                            </div>

                            <div>
                                <label className={`${labelCls} flex items-center gap-2`}>
                                    <User className="h-4 w-4 text-muted-foreground" /> Nombre
                                </label>
                                <input
                                    type="text"
                                    value={settings.name}
                                    onChange={(e) => set('name', e.target.value)}
                                    placeholder="Tu nombre"
                                    className={inputCls}
                                />
                            </div>

                            <div>
                                <label htmlFor="settings-weight-unit" className={`${labelCls} flex items-center gap-2`}>
                                    <Scale className="h-4 w-4 text-muted-foreground" /> Unidad de peso
                                </label>
                                <select id="settings-weight-unit" value={settings.weight_unit} onChange={(e) => set('weight_unit', e.target.value as 'kg' | 'lb')} className={inputCls}>
                                    <option value="kg">Kilogramos (kg)</option>
                                    <option value="lb">Libras (lb)</option>
                                </select>
                            </div>
                        </div>
                    </Section>

                    {/* ── Profesional ── */}
                    <Section title="Profesional" desc="Info de tu estudio o servicio." icon={<Building2 className="h-5 w-5" />}>
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
                    <Section title="Entrenamiento" desc="Valores por defecto al crear ejercicios." icon={<Dumbbell className="h-5 w-5" />}>
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
                    <Section title="Tracking" desc="Qué mostrar durante el entrenamiento." icon={<BarChart2 className="h-5 w-5" />}>
                        <div className="mt-5 space-y-1">
                            <ToggleRow label="Mostrar PRs" description="Avisa cuando registrás un nuevo récord desde el modo entrenador" checked={settings.show_prs} onChange={(v) => set('show_prs', v)} />
                        </div>
                    </Section>

                    {/* ── Cuenta ── */}
                    <div className={card}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className={sectionTitle}>Cuenta</h2>
                                <p className={sectionDesc}>Seguridad y acceso.</p>
                            </div>
                            <div className={iconBox}><Shield className="h-5 w-5" /></div>
                        </div>

                        <div className="mt-5 space-y-2">
                            <Link
                                href={`/forgot-password?email=${encodeURIComponent(email)}`}
                                className={accountControl}
                            >
                                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="flex-1 font-medium">Cambiar contraseña</span>
                                <span className="text-xs text-muted-foreground">Enviar enlace</span>
                            </Link>

                            <form action={signOutAction}>
                                <button
                                    type="submit"
                                    className={accountControl}
                                >
                                    <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="font-medium">Cerrar sesión</span>
                                </button>
                            </form>

                            <AccountDeletionCard />
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Sticky save bar ── */}
            <div
                className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-sm lg:bottom-0 lg:left-64"
            >
                <div className="mx-auto flex max-w-6xl items-center gap-3">
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
                        <p className="text-xs text-muted-foreground">
                            Cambios sin guardar
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                        className="h-10 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-40"
                    >
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function Section({
    title, desc, icon, children,
}: {
    title: string
    desc: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className={card}>
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
    label, description, checked, onChange,
}: {
    label: string
    description: string
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted/50"
        >
            <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="relative shrink-0">
                <div className={`h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/45'}`} />
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
        </button>
    )
}
