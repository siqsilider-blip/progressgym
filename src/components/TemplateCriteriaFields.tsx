import {
    TEMPLATE_EQUIPMENT,
    TEMPLATE_EXPERIENCE,
    TEMPLATE_GOALS,
    TEMPLATE_LOCATIONS,
    type TemplateMatchingProfile,
} from '@/lib/templateMatching'

type Props = {
    defaultValue?: Partial<TemplateMatchingProfile>
}

export default function TemplateCriteriaFields({ defaultValue }: Props) {
    return (
        <div className="space-y-5">
            <div>
                <p className="text-sm font-semibold text-foreground">¿Para qué objetivos sirve?</p>
                <p className="mt-1 text-xs text-muted-foreground">Podés marcar más de uno.</p>
                <CheckboxGrid name="target_goals" options={TEMPLATE_GOALS} selected={defaultValue?.target_goals} />
            </div>

            <div>
                <p className="text-sm font-semibold text-foreground">Nivel recomendado</p>
                <CheckboxGrid name="target_experience_levels" options={TEMPLATE_EXPERIENCE} selected={defaultValue?.target_experience_levels} />
            </div>

            <div>
                <p className="text-sm font-semibold text-foreground">Dónde se puede realizar</p>
                <CheckboxGrid name="target_locations" options={TEMPLATE_LOCATIONS} selected={defaultValue?.target_locations} />
            </div>

            <div>
                <p className="text-sm font-semibold text-foreground">Equipamiento necesario</p>
                <p className="mt-1 text-xs text-muted-foreground">Marcá solo lo indispensable para completar la rutina.</p>
                <CheckboxGrid name="required_equipment" options={TEMPLATE_EQUIPMENT} selected={defaultValue?.required_equipment} />
            </div>

            <div>
                <label htmlFor="target_session_minutes" className="mb-2 block text-sm font-semibold text-foreground">
                    Duración aproximada
                </label>
                <select
                    id="target_session_minutes"
                    name="target_session_minutes"
                    defaultValue={defaultValue?.target_session_minutes?.toString() ?? ''}
                    className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground outline-none focus:border-indigo-500"
                >
                    <option value="">Sin especificar</option>
                    {[30, 45, 60, 75, 90].map((minutes) => (
                        <option key={minutes} value={minutes}>{minutes} minutos</option>
                    ))}
                </select>
            </div>
        </div>
    )
}

function CheckboxGrid({
    name,
    options,
    selected = [],
}: {
    name: string
    options: Record<string, string>
    selected?: string[]
}) {
    return (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(options).map(([value, label]) => (
                <label
                    key={value}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground transition has-[:checked]:border-indigo-500/60 has-[:checked]:bg-indigo-500/10 has-[:checked]:text-indigo-300"
                >
                    <input
                        type="checkbox"
                        name={name}
                        value={value}
                        defaultChecked={selected.includes(value)}
                        className="h-4 w-4 shrink-0 accent-indigo-600"
                    />
                    {label}
                </label>
            ))}
        </div>
    )
}
