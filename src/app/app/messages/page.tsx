import { redirect } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStudentAppContext } from '@/lib/auth/student'
import MessageComposer from '@/components/coaching/MessageComposer'
import ReadMarker from '@/components/coaching/ReadMarker'
import { getRoutineExerciseNameMap } from '@/lib/coaching/getRoutineExerciseNames'
import StudentMessageThread from '@/components/student/StudentMessageThread'

type MessageRow = {
    id: string
    sender_role: 'trainer' | 'student'
    topic: string
    body: string
    routine_day_exercise_id: string | null
    created_at: string
}

const TOPIC_LABELS: Record<string, string> = {
    general: 'Mensaje',
    question: 'Duda',
    pain: 'Molestia',
    equipment: 'Equipo',
    technique: 'Técnica',
    alternative: 'Alternativa',
}

export default async function StudentMessagesPage() {
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const studentId = context.profile.student_id
    if (!studentId) redirect('/app')

    const supabase = await createClient()
    const [{ data: student }, conversationResult] = await Promise.all([
        supabase
            .from('students')
            .select('trainer_id')
            .eq('id', studentId)
            .maybeSingle(),
        supabase.rpc('ensure_coaching_conversation', { p_student_id: studentId }),
    ])

    let trainerName = 'Tu entrenador'
    if (student?.trainer_id) {
        const { data: trainer } = await supabase
            .from('trainers')
            .select('full_name')
            .eq('id', student.trainer_id)
            .maybeSingle()
        trainerName = trainer?.full_name?.trim() || trainerName
    }

    const conversationId = conversationResult.data as string | null
    const { data: messages } = conversationId
        ? await supabase
            .from('coaching_messages')
            .select('id, sender_role, topic, body, routine_day_exercise_id, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(200)
        : { data: [] }

    const typedMessages = (messages as MessageRow[] | null) ?? []
    const exerciseNameByRoutineExercise = await getRoutineExerciseNameMap(
        supabase,
        typedMessages.map((message) => message.routine_day_exercise_id)
    )

    return (
        <main className="mx-auto max-w-lg px-4 pb-32 pt-5">
            {conversationId && <ReadMarker conversationId={conversationId} />}

            <header>
                <p className="text-sm font-bold text-brand-soft">Tu entrenador</p>
                <h1 className="mt-1 text-2xl font-black text-foreground">{trainerName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">Preguntá, contá una molestia o pedí una alternativa.</p>
            </header>

            {conversationResult.error && (
                <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-amber-500">
                    La mensajería se habilitará cuando se aplique la migración de seguimiento.
                </div>
            )}

            <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                <StudentMessageThread>
                {typedMessages.length ? (
                    typedMessages.map((message) => {
                        const own = message.sender_role === 'student'
                        const exerciseName = message.routine_day_exercise_id
                            ? exerciseNameByRoutineExercise.get(message.routine_day_exercise_id)
                            : null
                        return (
                            <article key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 ${own ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border bg-background text-foreground'}`}>
                                    <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide opacity-70">
                                        <span>{own ? 'Vos' : trainerName}</span>
                                        <span>·</span>
                                        <span>{TOPIC_LABELS[message.topic] ?? 'Mensaje'}</span>
                                    </div>
                                    {message.routine_day_exercise_id && (
                                        <p className="mb-1.5 inline-flex max-w-full rounded-md border border-current/15 bg-black/10 px-2 py-1 text-xs font-bold leading-4 opacity-80">
                                            Ejercicio · {exerciseName ?? 'Ejercicio de la rutina'}
                                        </p>
                                    )}
                                    <p className="whitespace-pre-wrap text-sm leading-5">{message.body}</p>
                                    <p className="mt-1 text-right text-[11px] opacity-60">{formatMessageDate(message.created_at)}</p>
                                </div>
                            </article>
                        )
                    })
                ) : (
                    <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                        <MessageCircle className="h-8 w-8 text-primary" />
                        <p className="mt-3 text-sm font-bold text-foreground">Consultá cuando lo necesites</p>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">Podés preguntar por un ejercicio, informar una molestia o pedir una alternativa.</p>
                    </div>
                )}
                </StudentMessageThread>
            </section>

            <section className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-20 mt-3 rounded-2xl border border-border bg-card p-3 shadow-[0_-8px_30px_-18px_rgba(0,0,0,0.8)]">
                <MessageComposer placeholder="Escribile a tu entrenador…" />
            </section>
        </main>
    )
}

function formatMessageDate(value: string) {
    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(value))
}
