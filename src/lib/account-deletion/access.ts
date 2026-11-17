import 'server-only'

import { createClient } from '@/lib/supabase/server'

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

const ACTIVE_DELETION_STATUSES = [
    'pending',
    'processing',
    'retry_wait',
    'needs_review',
    'failed',
] as const

export type AccountDeletionAccessState = 'allowed' | 'blocked' | 'verification_failed'

export async function getAccountDeletionAccessState(
    supabase: ServerSupabaseClient,
    userId: string
): Promise<AccountDeletionAccessState> {
    const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('status')
        .eq('user_id', userId)
        .in('status', [...ACTIVE_DELETION_STATUSES])
        .maybeSingle()

    if (error) {
        console.error('[account-deletion] no se pudo verificar el estado de la cuenta', {
            code: error.code,
        })
        return 'verification_failed'
    }

    return data ? 'blocked' : 'allowed'
}
