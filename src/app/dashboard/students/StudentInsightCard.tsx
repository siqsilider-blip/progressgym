type InsightTone = 'success' | 'warning' | 'neutral' | 'info'

type StudentInsight = {
    title: string
    description: string
    tone: InsightTone
    badge?: string
}

function getToneClasses(tone: InsightTone) {
    switch (tone) {
        case 'success':
            return {
                wrapper:
                    'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10',
                badge:
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                title: 'text-emerald-800 dark:text-emerald-300',
                description: 'text-emerald-700/90 dark:text-emerald-200/80',
            }

        case 'warning':
            return {
                wrapper:
                    'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10',
                badge:
                    'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
                title: 'text-amber-800 dark:text-amber-300',
                description: 'text-amber-700/90 dark:text-amber-200/80',
            }

        case 'info':
            return {
                wrapper:
                    'border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10',
                badge:
                    'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
                title: 'text-indigo-800 dark:text-indigo-300',
                description: 'text-indigo-700/90 dark:text-indigo-200/80',
            }

        default:
            return {
                wrapper:
                    'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60',
                badge:
                    'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                title: 'text-zinc-900 dark:text-zinc-100',
                description: 'text-zinc-600 dark:text-zinc-400',
            }
    }
}

export default function StudentInsightCard({
    insight,
}: {
    insight: StudentInsight
}) {
    const tone = getToneClasses(insight.tone)

    return (
        <div className={`rounded-2xl border p-4 shadow-sm ${tone.wrapper}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={`text-base font-semibold ${tone.title}`}>
                        {insight.title}
                    </p>
                    <p className={`mt-1 text-sm ${tone.description}`}>
                        {insight.description}
                    </p>
                </div>

                {insight.badge ? (
                    <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
                    >
                        {insight.badge}
                    </span>
                ) : null}
            </div>
        </div>
    )
}