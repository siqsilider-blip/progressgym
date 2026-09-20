'use server'

import { createClient } from '@/lib/supabase/server'

export type DeleteAccountResult =
    | { ok: true }
    | { ok: false; error: string }

export async function requestOwnAccountDeletion(confirmation: string): Promise<DeleteAccountResult> {
    if (confirmation.trim().toUpperCase() !== 'ELIMINAR') {
        return { ok: false, error: 'Escribí ELIMINAR para confirmar.' }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { ok: false, error: 'Tu sesión venció. Volvé a ingresar e intentá nuevamente.' }
    }

    const { error } = await supabase.rpc('request_own_account_deletion')

    if (error) {
        console.error('[requestOwnAccountDeletion]', error)
        const migrationMissing = error.message.includes('request_own_account_deletion') || error.code === 'PGRST202'
        return {
            ok: false,
            error: migrationMissing
                ? 'La solicitud todavía no está habilitada. Contactá a soporte.'
                : 'No pudimos registrar la solicitud. No se modificó tu cuenta; intentá nuevamente o contactá a soporte.',
        }
    }

    await supabase.auth.signOut()
    return { ok: true }
}
