import type { SupabaseClient } from '@supabase/supabase-js'

export const COACHING_MESSAGES_READ_EVENT = 'progrezzia:coaching-messages-read'

export function unreadTrainerMessagesQuery(client: SupabaseClient, studentId: string, trainerId: string) {
    return client
        .from('coaching_messages')
        .select('id, coaching_conversations!inner(student_id, trainer_id)', { count: 'exact', head: true })
        .eq('coaching_conversations.student_id', studentId)
        .eq('coaching_conversations.trainer_id', trainerId)
        .eq('sender_role', 'trainer')
        .is('read_at', null)
}
