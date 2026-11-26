import { redirect } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStudentAppContext } from '@/lib/auth/student'
import MessageComposer from '@/components/coaching/MessageComposer'
import ReadMarker from '@/components/coaching/ReadMarker'
import { getRoutineExerciseNameMap } from '@/lib/coaching/getRoutineExerciseNames'
import StudentMessageThread from '@/components/student/StudentMessageThread'
import { StudentNotebookHeader } from '@/components/student/StudentNotebook'

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

const messageDay = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
})
const messageTime = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
})

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
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(200)
        : { data: [] }

    const typedMessages = (messages as MessageRow[] | null) ?? []
    const latestMessageId = typedMessages[0]?.id ?? null
    typedMessages.reverse()
    const exerciseNameByRoutineExercise = await getRoutineExerciseNameMap(
        supabase,
        typedMessages.map((message) => message.routine_day_exercise_id)
    )

    return (
        <main
            className="mx-auto flex max-w-lg flex-col overflow-hidden px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6"
            style={{ height: 'calc(100dvh - 4.75rem - env(safe-area-inset-bottom, 0px))' }}
        >
            {conversationId && <ReadMarker conversationId={conversationId} latestMessageId={latestMessageId} />}

            <div className="shrink-0">
                <StudentNotebookHeader section="Mensajes" title="Tu entrenador" subtitle={trainerName === 'Tu entrenador' ? 'Conversación privada' : `${trainerName} · Conversación privada`} />
            </div>

            {conversationResult.error && (
                <div className="mt-4 shrink-0 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-amber-500">
                    La mensajería se habilitará cuando se aplique la migración de seguimiento.
                </div>
            )}

            <section className="mt-3 min-h-0 flex-1 overflow-hidden">
                <StudentMessageThread scrollKey={latestMessageId ?? 'empty'}>
                {typedMessages.length ? (
                    typedMessages.map((message, index) => {
                        const own = message.sender_role === 'student'
                        const dayLabel = messageDay.format(new Date(message.created_at))
                        const previous = typedMessages[index - 1]
                        const startsDay = !previous || messageDay.format(new Date(previous.created_at)) !== dayLabel
                        const exerciseName = message.routine_day_exercise_id
                            ? exerciseNameByRoutineExercise.get(message.routine_day_exercise_id)
                            : null
                        return (
                            <article key={message.id}>
                                {startsDay && <p className="mb-3 border-t border-border pt-2 text-xs text-muted-foreground">{dayLabel.charAt(0).toLocaleUpperCase('es-AR') + dayLabel.slice(1)}</p>}
                                <div className="flex items-start gap-2.5">
                                    <span aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold ${own ? 'bg-accent text-brand-soft' : 'bg-card text-muted-foreground'}`}>
                                        {own ? 'V' : trainerName.charAt(0).toLocaleUpperCase('es-AR')}
                                    </span>
                                    <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                        <div className="flex flex-wrap justify-between gap-x-3 text-xs">
                                            <span className="font-semibold">{own ? 'Vos' : trainerName} · {TOPIC_LABELS[message.topic] ?? 'Mensaje'}</span>
                                            <time dateTime={message.created_at} className="text-muted-foreground">{messageTime.format(new Date(message.created_at))}</time>
                                        </div>
                                        {message.routine_day_exercise_id && (
                                            <p className="mt-0.5 text-xs font-semibold text-brand-soft">Ejercicio · {exerciseName ?? 'Ejercicio de la rutina'}</p>
                                        )}
                                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                                    </div>
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

            <section className="mt-2 shrink-0 border-t border-border pt-2">
                <MessageComposer compact placeholder="Escribile a tu entrenador…" />
            </section>
        </main>
    )
}
