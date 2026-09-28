'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ChevronRight, Clock3, Dumbbell, HeartPulse, MapPin, Target } from 'lucide-react'
import { saveStudentOnboarding, type OnboardingFormState } from './actions'
import {
    ONBOARDING_EQUIPMENT,
    ONBOARDING_EXPERIENCE,
    ONBOARDING_GOALS,
    ONBOARDING_LOCATIONS,
    type StudentOnboardingProfile,
} from '@/lib/studentOnboarding'

const initialState: OnboardingFormState = { error: null }

function SubmitButton({ editing }: { editing: boolean }) {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition active:scale-[0.99] disabled:opacity-60"
        >
            {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar y empezar'}
            {!pending && <ChevronRight className="h-4 w-4" />}
        </button>
    )
}

function SectionTitle({ icon: Icon, title, helper }: { icon: typeof Target; title: string; helper?: string }) {
    return (
        <div className="mb-3 flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                <Icon className="h-4 w-4" />
            </span>
            <div>
                <h2 className="text-sm font-black text-foreground">{title}</h2>
                {helper && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{helper}</p>}
            </div>
        </div>
    )
}

export default function OnboardingForm({ profile }: { profile: StudentOnboardingProfile | null }) {
    const [state, formAction] = useFormState(saveStudentOnboarding, initialState)

    return (
        <form action={formAction} className="space-y-3">
            <section className="rounded-2xl border border-border bg-card p-4">
                <SectionTitle icon={Target} title="¿Qué querés lograr?" helper="Elegí hasta tres opciones." />
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ONBOARDING_GOALS).map(([value, label]) => (
                        <label key={value} className="group relative cursor-pointer">
                            <input
                                type="checkbox"
                                name="goals"
                                value={value}
                                defaultChecked={profile?.goals.includes(value)}
                                className="peer sr-only"
                            />
                            <span className="flex min-h-12 items-center rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground transition peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10 peer-checked:text-indigo-400">
                                {label}
                            </span>
                        </label>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
                <SectionTitle icon={Dumbbell} title="¿Cuánta experiencia tenés?" />
                <div className="space-y-2">
                    {Object.entries(ONBOARDING_EXPERIENCE).map(([value, label]) => (
                        <label key={value} className="block cursor-pointer">
                            <input
                                type="radio"
                                name="experience"
                                value={value}
                                defaultChecked={profile?.experience_level === value}
                                className="peer sr-only"
                            />
                            <span className="flex min-h-12 items-center rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground transition peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10 peer-checked:text-indigo-400">
                                {label}
                            </span>
                        </label>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
                <SectionTitle icon={Clock3} title="¿Cuánto tiempo tenés?" helper="Usamos esto para ajustar el volumen de la rutina." />
                <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1.5 text-[11px] font-bold text-muted-foreground">
                        Días por semana
                        <select name="days" defaultValue={profile?.training_days_per_week ?? 3} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-indigo-500">
                            {[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{day} {day === 1 ? 'día' : 'días'}</option>)}
                        </select>
                    </label>
                    <label className="space-y-1.5 text-[11px] font-bold text-muted-foreground">
                        Minutos por sesión
                        <select name="duration" defaultValue={profile?.session_minutes ?? 60} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-indigo-500">
                            {[30, 45, 60, 75, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                        </select>
                    </label>
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
                <SectionTitle icon={MapPin} title="¿Dónde vas a entrenar?" />
                <div className="grid grid-cols-3 gap-2">
                    {Object.entries(ONBOARDING_LOCATIONS).map(([value, label]) => (
                        <label key={value} className="cursor-pointer">
                            <input
                                type="radio"
                                name="location"
                                value={value}
                                defaultChecked={profile?.training_location === value}
                                className="peer sr-only"
                            />
                            <span className="flex h-12 items-center justify-center rounded-xl border border-border bg-background px-2 text-center text-xs font-bold text-foreground transition peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10 peer-checked:text-indigo-400">
                                {label}
                            </span>
                        </label>
                    ))}
                </div>
                <p className="mb-2 mt-4 text-[11px] font-bold text-muted-foreground">¿Qué tenés disponible?</p>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(ONBOARDING_EQUIPMENT).map(([value, label]) => (
                        <label key={value} className="cursor-pointer">
                            <input
                                type="checkbox"
                                name="equipment"
                                value={value}
                                defaultChecked={profile?.available_equipment.includes(value)}
                                className="peer sr-only"
                            />
                            <span className="flex h-10 items-center rounded-full border border-border bg-background px-3 text-[11px] font-bold text-foreground transition peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10 peer-checked:text-indigo-400">
                                {label}
                            </span>
                        </label>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
                <SectionTitle icon={HeartPulse} title="Cuidemos tu entrenamiento" helper="Esta información le sirve a tu entrenador para adaptar los ejercicios." />
                <label className="block text-[11px] font-bold text-muted-foreground">
                    ¿Tenés dolores, lesiones o movimientos que debamos cuidar?
                    <textarea
                        name="limitations"
                        defaultValue={profile?.limitations ?? ''}
                        maxLength={1000}
                        rows={3}
                        placeholder="Ej: me molesta la rodilla al bajar escaleras…"
                        className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-normal leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                    />
                </label>
                <label className="mt-3 block text-[11px] font-bold text-muted-foreground">
                    ¿Hay algo que te guste, no te guste o quieras contarle?
                    <textarea
                        name="preferences"
                        defaultValue={profile?.preferences ?? ''}
                        maxLength={1000}
                        rows={3}
                        placeholder="Opcional"
                        className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-normal leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                    />
                </label>
            </section>

            {state.error && (
                <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-medium text-red-400">
                    {state.error}
                </div>
            )}

            <SubmitButton editing={Boolean(profile)} />
            <p className="px-3 text-center text-[10px] leading-4 text-muted-foreground">
                Podés cambiar estos datos más adelante desde tu perfil.
            </p>
        </form>
    )
}
