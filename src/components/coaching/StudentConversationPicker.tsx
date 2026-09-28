'use client'

import { useRouter } from 'next/navigation'

export type ConversationStudentOption = {
    id: string
    label: string
    unread: number
}

export default function StudentConversationPicker({
    students,
    selectedStudentId,
}: {
    students: ConversationStudentOption[]
    selectedStudentId: string
}) {
    const router = useRouter()

    return (
        <label className="block rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Conversación con</span>
            <select
                value={selectedStudentId}
                onChange={(event) => router.push(`/dashboard/messages?student=${event.target.value}`)}
                className="h-12 w-full rounded-xl border border-violet-500/25 bg-[#0d0d12] px-3 text-sm font-bold text-white outline-none focus:border-violet-500"
            >
                {students.map((student) => (
                    <option key={student.id} value={student.id}>
                        {student.label}{student.unread > 0 ? ` · ${student.unread} sin leer` : ''}
                    </option>
                ))}
            </select>
        </label>
    )
}
