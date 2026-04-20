type StudentAdherence = {
    sessionsThisWeek: number
    expected: number
    adherence: number
}

function getTone(adherence: number) {
    if (adherence >= 80) {
        return {
            badge: 'Excelente',
            badgeClasses:
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
            barClasses: 'bg-emerald-500',
            textClasses: 'text-emerald-600 dark:text-emerald-400',
            panelClasses:
                'border-emerald-200 bg-emerald-50 dark:border-emerald-500/15 dark:bg-emerald-500/10',
            description:
                'Está cumpliendo muy bien la frecuencia semanal planificada.',
        }
    }

    if (adherence >= 50) {
        return {
            badge: 'Media',
            badgeClasses:
                'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
            barClasses: 'bg-amber-500',
            textClasses: 'text-amber-600 dark:text-amber-400',
            panelClasses:
                'border-amber-200 bg-amber-50 dark:border-amber-500/15 dark:bg-amber-500/10',
            description:
                'Cumplió parte de la rutina. Conviene reforzar constancia esta semana.',
        }
    }

    return {
        badge: 'Baja',
        badgeClasses:
            'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        barClasses: 'bg-red-500',
        textClasses: 'text-red-600 dark:text-red-400',
        panelClasses:
            'border-red-200 bg-red-50 dark:border-red-500/15 dark:bg-red-500/10',
        description:
            'La adherencia está por debajo de lo esperado. Priorizar asistencia.',
    }
}

export default function StudentAdherenceCard({
    adherence,
}: {
    adherence: StudentAdherence
}) {
    const tone = getTone(adherence.adherence)

    return (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Adherencia semanal
                </h2>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.badgeClasses}`}
                >
                    {tone.badge}
                </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Sesiones
                    </p>
                    <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                        {adherence.sessionsThisWeek} / {adherence.expected}
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Cumplimiento
                    </p>
                    <p className={`mt-2 text-3xl font-bold ${tone.textClasses}`}>
                        {adherence.adherence}%
                    </p>
                </div>
            </div>

            <div className="mt-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                        className={`h-full rounded-full ${tone.barClasses} transition-all`}
                        style={{ width: `${adherence.adherence}%` }}
                    />
                </div>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${tone.panelClasses}`}>
                <p className={`text-sm font-medium ${tone.textClasses}`}>
                    {tone.description}
                </p>
            </div>
        </div>
    )
}