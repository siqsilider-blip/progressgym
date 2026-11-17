import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccountDeletionAccessState } from '@/lib/account-deletion/access'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const requestedNext = searchParams.get('next') ?? '/reset-password'
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
        ? requestedNext
        : '/reset-password'

    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                await supabase.auth.signOut()
                redirect('/forgot-password?message=El link no es válido o expiró. Pedí uno nuevo.')
            }

            const accessState = await getAccountDeletionAccessState(supabase, user.id)
            if (accessState !== 'allowed') {
                await supabase.auth.signOut()
                redirect(accessState === 'blocked'
                    ? '/account-deletion?pending=1'
                    : '/account-deletion?verification=1')
            }

            redirect(next)
        }

        console.error('[auth/confirm] verifyOtp error:', error)
    }

    redirect('/forgot-password?message=El link no es válido o expiró. Pedí uno nuevo.')
}
