'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccountDeletionAccessState } from '@/lib/account-deletion/access'

type InvitationVerificationType = 'signup' | 'recovery'

function isInvitationVerificationType(value: string): value is InvitationVerificationType {
    return value === 'signup' || value === 'recovery'
}

export async function acceptStudentInvitation(formData: FormData) {
    const tokenHash = String(formData.get('token_hash') ?? '')
    const type = String(formData.get('type') ?? '')

    if (!tokenHash || !isInvitationVerificationType(type)) {
        redirect('/forgot-password?message=El enlace no es válido. Pedile uno nuevo a tu entrenador.')
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
    })

    if (error) {
        console.error('[auth/invitation] verifyOtp error:', error)
        redirect('/forgot-password?message=El enlace no es válido o expiró. Pedile uno nuevo a tu entrenador.')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        await supabase.auth.signOut()
        redirect('/forgot-password?message=El enlace no es válido o expiró. Pedile uno nuevo a tu entrenador.')
    }

    const accessState = await getAccountDeletionAccessState(supabase, user.id)
    if (accessState !== 'allowed') {
        await supabase.auth.signOut()
        redirect(accessState === 'blocked'
            ? '/account-deletion?pending=1'
            : '/account-deletion?verification=1')
    }

    redirect('/reset-password?invite=1')
}
