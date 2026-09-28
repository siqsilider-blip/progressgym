import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'
import MessageComposer from '@/components/coaching/MessageComposer'
import ReadMarker from '@/components/coaching/ReadMarker'
import NotificationTypeReadMarker from '@/components/coaching/NotificationTypeReadMarker'

type PageProps = { searchParams?: Promise<{ student?: string }> }
type StudentRow = { id: string; first_name: string; last_name: string }
type ConversationRow = { id: string; student_id: string; last_message_at: string | null }
type MessageRow = {
    id: string
    sender_role: 'trainer' | 'student'
    topic: string
    body: string
    read_at: string | null
    created_at: string
}
type FeedbackRow = {
    id: string
    student_id: string
    energy: number | null
    difficulty: number | null
    had_pain: boolean
    pain_details: string | null
    comment: string | null
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

export default async function TrainerMessagesPage(props: PageProps) {
    const searchParams = await props.searchParams
    const user = await getServerUser()
    if (!user) redirect('/login')

    const supabase = await createClient()
    const [{ data: studentsData }, { data: conversationsData }, { data: feedbackData }] = await Promise.all([
        supabase
            .from('students')
            .select('id, first_name, last_name')
            .eq('trainer_id', user.id)
            .order('first_name'),
        supabase
            .from('coaching_conversations')
            .select('id, student_id, last_message_at')
            .eq('trainer_id', user.id)
            .order('last_message_at', { ascending: false, nullsFirst: false }),
        supabase
            .from('workout_feedback')
            .select('id, student_id, energy, difficulty, had_pain, pain_details, comment, created_at')
            .eq('trainer_id', user.id)
            .order('created_at', { ascending: false })
            .limit(8),
    ])

    const students = (studentsData as StudentRow[] | null) ?? []
    const conversations = (conversationsData as ConversationRow[] | null) ?? []
    const studentMap = new Map(students.map((student) => [student.id, student]))
    const conversationByStudent = new Map(conversations.map((item) => [item.student_id, item]))

    const orderedStudents = [...students].sort((a, b) => {
        const aActivity = conversationByStudent.get(a.id)?.last_message_at ?? ''
        const bActivity = conversationByStudent.get(b.id)?.last_message_at ?? ''
        return bActivity.localeCompare(aActivity) || a.first_name.localeCompare(b.first_name)
    })

    const requestedStudentId = searchParams?.student
    const selectedStudent = orderedStudents.find((item) => item.id === requestedStudentId)
        ?? orderedStudents[0]
        ?? null

    let conversationId = selectedStudent
        ? conversationByStudent.get(selectedStudent.id)?.id ?? null
        : null

    if (selectedStudent && !conversationId) {
        const result = await supabase.rpc('ensure_coaching_conversation', {
            p_student_id: selectedStudent.id,
        })
        conversationId = result.data as string | null
    }

    const { data: messageData } = conversationId
        ? await supabase
            .from('coaching_messages')
            .select('id, sender_role, topic, body, read_at, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(200)
        : { data: [] }

    const messages = (messageData as MessageRow[] | null) ?? []
    const unreadByConversation = new Map<string, number>()
    if (conversations.length > 0) {
        const { data: unreadMessages } = await supabase
            .from('coaching_messages')
            .select('conversation_id')
            .in('conversation_id', conversations.map((item) => item.id))
            .eq('sender_role', 'student')
            .is('read_at', null)

        for (const row of unreadMessages ?? []) {
            unreadByConversation.set(row.conversation_id, (unreadByConversation.get(row.conversation_id) ?? 0) + 1)
        }
    }

    return (
        <main className="mx-auto max-w-6xl space-y-4 p-4 pb-24 md:p-6">
            {conversationId && <ReadMarker conversationId={conversationId} />}
            <NotificationTypeReadMarker type="workout_feedback" />

            <header>
                <p className="text-xs font-medium text-violet-400">Seguimiento</p>
                <h1 className="mt-1 text-xl font-black text-white md:text-2xl">Mensajes</h1>
                <p className="mt-1 text-xs text-white/40">Consultas, molestias y respuestas de tus alumnos.</p>
            </header>

            {(feedbackData as FeedbackRow[] | null)?.length ? (
                <section>
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Controles recientes</h2>
                        <span className="text-[10px] text-white/25">Después de entrenar</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {(feedbackData as FeedbackRow[]).map((feedback) => {
                            const student = studentMap.get(feedback.student_id)
                            return (
                                <Link key={feedback.id} href={`/dashboard/students/${feedback.student_id}`} className={`min-w-64 rounded-2xl border p-3 ${feedback.had_pain ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-white/[0.07] bg-white/[0.03]'}`}>
                                    <div className="flex items-center gap-2">
                                        {feedback.had_pain && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                                        <p className="text-xs font-bold text-white">{student ? `${student.first_name} ${student.last_name}` : 'Alumno'}</p>
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/45">
                                        {feedback.had_pain
                                            ? feedback.pain_details || 'Informó una molestia.'
                                            : `Energía ${feedback.energy ?? '—'}/5 · Dificultad ${feedback.difficulty ?? '—'}/5${feedback.comment ? ` · ${feedback.comment}` : ''}`}
                                    </p>
                                </Link>
                            )
                        })}
                    </div>
                </section>
            ) : null}

            {orderedStudents.length === 0 ? (
                <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-violet-400" />
                    <p className="mt-3 text-sm font-bold text-white">Todavía no hay alumnos</p>
                    <p className="mt-1 text-xs text-white/35">Cuando agregues uno, vas a poder conversar desde acá.</p>
                </section>
            ) : (
                <div className="grid gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2">
                        <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-white/30">Alumnos</p>
                        <div className="flex gap-2 overflow-x-auto md:block md:space-y-1 md:overflow-visible">
                            {orderedStudents.map((student) => {
                                const selected = student.id === selectedStudent?.id
                                const conversation = conversationByStudent.get(student.id)
                                const unread = conversation ? unreadByConversation.get(conversation.id) ?? 0 : 0
                                return (
                                    <Link key={student.id} href={`/dashboard/messages?student=${student.id}`} className={`flex min-w-52 items-center gap-2 rounded-xl border px-3 py-2.5 transition md:min-w-0 ${selected ? 'border-violet-500/30 bg-violet-500/10' : 'border-transparent hover:bg-white/[0.04]'}`}>
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-black text-white/65">{student.first_name.slice(0, 1)}{student.last_name.slice(0, 1)}</span>
                                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/75">{student.first_name} {student.last_name}</span>
                                        {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-black text-white">{unread}</span>}
                                    </Link>
                                )
                            })}
                        </div>
                    </aside>

                    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                        <div className="border-b border-white/[0.06] px-1 pb-3">
                            <h2 className="text-sm font-bold text-white">{selectedStudent?.first_name} {selectedStudent?.last_name}</h2>
                            <p className="text-[10px] text-white/35">Conversación privada</p>
                        </div>

                        <div className="min-h-72 space-y-2 py-3">
                            {messages.length ? messages.map((message) => {
                                const own = message.sender_role === 'trainer'
                                return (
                                    <article key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 ${own ? 'rounded-br-md bg-violet-600 text-white' : 'rounded-bl-md border border-white/[0.08] bg-[#0d0d12] text-white/85'}`}>
                                            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide opacity-60">{own ? 'Vos' : selectedStudent?.first_name} · {TOPIC_LABELS[message.topic] ?? 'Mensaje'}</p>
                                            <p className="whitespace-pre-wrap text-sm leading-5">{message.body}</p>
                                            <p className="mt-1 text-right text-[9px] opacity-50">{formatMessageDate(message.created_at)}</p>
                                        </div>
                                    </article>
                                )
                            }) : (
                                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                                    <MessageCircle className="h-8 w-8 text-violet-400" />
                                    <p className="mt-3 text-sm font-bold text-white">Iniciar conversación</p>
                                    <p className="mt-1 max-w-sm text-xs leading-5 text-white/35">Podés enviar una indicación o responder cuando el alumno consulte desde su entrenamiento.</p>
                                </div>
                            )}
                        </div>

                        {selectedStudent && (
                            <div className="border-t border-white/[0.06] pt-3 [--background:#0d0d12] [--border:rgba(255,255,255,0.1)] [--foreground:white] [--muted-foreground:rgba(255,255,255,0.4)]">
                                <MessageComposer studentId={selectedStudent.id} placeholder={`Escribirle a ${selectedStudent.first_name}…`} />
                            </div>
                        )}
                    </section>
                </div>
            )}
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
