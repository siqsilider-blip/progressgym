import { redirect } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStudentAppContext } from '@/lib/auth/student'
import MessageComposer from '@/components/coaching/MessageComposer'
import ReadMarker from '@/components/coaching/ReadMarker'
import { getRoutineExerciseNameMap } from '@/lib/coaching/getRoutineExerciseNames'
import StudentMessageThread from '@/components/student/StudentMessageThread'
import { StudentNotebookHeader } from '@/components/student/StudentNotebook'
import { addDateOnlyDays } from '@/lib/routineCalendar'

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

const timeZone = 'America/Argentina/Buenos_Aires'
const dateKey = new Intl.DateTimeFormat('en-CA', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone })
const shortDate = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone })
const messageTime = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', timeZone,
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
    const chronologicalMessages = [...typedMessages].reverse().map((message) => {
        const sentAt = new Date(message.created_at)
        return { ...message, sentAt, day: dateKey.format(sentAt) }
    })
    const today = dateKey.format(new Date())
    const yesterday = addDateOnlyDays(today, -1)
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
                <StudentNotebookHeader section="Mensajes" title={trainerName} />
            </div>

            {conversationResult.error && (
                <div className="mt-4 shrink-0 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-amber-500">
                    La mensajería se habilitará cuando se aplique la migración de seguimiento.
                </div>
            )}

            <section className="mt-3 min-h-0 flex-1 overflow-hidden">
                <StudentMessageThread scrollKey={latestMessageId ?? 'empty'}>
                {chronologicalMessages.length ? (
                    chronologicalMessages.map((message, index) => {
                        const own = message.sender_role === 'student'
                        const previous = chronologicalMessages[index - 1]
                        const startsDay = previous?.day !== message.day
                        const startsGroup = startsDay || previous?.sender_role !== message.sender_role
                        const dayLabel = message.day === today ? 'Hoy'
                            : message.day === yesterday ? 'Ayer'
                                : `${shortDate.format(message.sentAt)}${message.day.slice(0, 4) === today.slice(0, 4) ? '' : ` ${message.day.slice(0, 4)}`}`
                        const exerciseName = message.routine_day_exercise_id
                            ? exerciseNameByRoutineExercise.get(message.routine_day_exercise_id) ?? 'Ejercicio de la rutina'
                            : null
                        const hasExerciseLabel = exerciseName && (startsGroup || previous?.routine_day_exercise_id !== message.routine_day_exercise_id)
                        return (
                            <article key={message.id}>
                                {startsDay && (
                                    <p className="mt-5 mb-3 flex items-center gap-2.5 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                                        <time dateTime={message.day}>{dayLabel}</time>
                                    </p>
                                )}
                                <div className={`flex ${own ? 'justify-end' : 'justify-start'} ${startsDay ? '' : startsGroup ? 'mt-3' : 'mt-1'}`}>
                                    <div
                                        className={`max-w-[89%] min-w-0 rounded-2xl px-3.5 py-2.5 [overflow-wrap:anywhere] ${own ? 'rounded-br-md bg-accent text-accent-foreground' : 'rounded-bl-md bg-card text-card-foreground'}`}
                                        title={messageTime.format(message.sentAt)}
                                    >
                                        <p className="sr-only">
                                            {own ? 'Vos' : trainerName} · {TOPIC_LABELS[message.topic] ?? 'Mensaje'}
                                            {exerciseName && !hasExerciseLabel ? ` · ${exerciseName}` : ''}
                                            {' · '}<time dateTime={message.created_at}>{messageTime.format(message.sentAt)}</time>
                                        </p>
                                        {hasExerciseLabel && <p className="mb-0.5 text-xs font-medium text-brand-soft">{exerciseName}</p>}
                                        <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed sm:text-base">{message.body}</p>
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
                <MessageComposer thread placeholder="Escribile a tu entrenador…" />
            </section>
        </main>
    )
}
