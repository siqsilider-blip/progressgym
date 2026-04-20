'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createContact(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const full_name = String(formData.get('full_name') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    const objective = String(formData.get('objective') || '').trim()
    const status = String(formData.get('status') || 'new').trim()
    const temperature = String(formData.get('temperature') || 'warm').trim()
    const next_follow_up_at = String(formData.get('next_follow_up_at') || '').trim()
    const notes = String(formData.get('notes') || '').trim()

    if (!full_name) {
        redirect('/dashboard/contacts/new?message=El nombre es obligatorio')
    }

    const payload = {
        trainer_id: user.id,
        full_name,
        phone: phone || null,
        objective: objective || null,
        status: status || 'new',
        temperature: temperature || 'warm',
        next_follow_up_at: next_follow_up_at || null,
        notes: notes || null,
        last_contact_at: null,
        converted_to_student: false,
        is_archived: false,
    }

    const { error } = await supabase.from('contacts').insert(payload)

    if (error) {
        console.error('Error creating contact:', error)
        redirect('/dashboard/contacts/new?message=No se pudo crear el contacto')
    }

    revalidatePath('/dashboard/contacts')
    redirect('/dashboard/contacts')
}

export async function updateContact(formData: FormData) {
    const supabase = await createClient()

    const id = String(formData.get('id') || '').trim()

    if (!id) {
        redirect('/dashboard/contacts?message=Falta el id del contacto')
    }

    const payload = {
        full_name: String(formData.get('full_name') || '').trim() || null,
        phone: String(formData.get('phone') || '').trim() || null,
        objective: String(formData.get('objective') || '').trim() || null,
        status: String(formData.get('status') || 'new').trim(),
        temperature: String(formData.get('temperature') || 'warm').trim(),
        next_follow_up_at:
            String(formData.get('next_follow_up_at') || '').trim() || null,
        notes: String(formData.get('notes') || '').trim() || null,
    }

    const { error } = await supabase.from('contacts').update(payload).eq('id', id)

    if (error) {
        console.error('Error updating contact:', error)
        redirect('/dashboard/contacts?message=No se pudo actualizar el contacto')
    }

    revalidatePath('/dashboard/contacts')
    redirect('/dashboard/contacts')
}

export async function updateContactNoRedirect(
    formData: FormData
): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: false, error: 'No autenticado' }

    const id = String(formData.get('id') || '').trim()
    if (!id) return { ok: false, error: 'Falta el id del contacto' }

    const payload = {
        full_name: String(formData.get('full_name') || '').trim() || null,
        phone: String(formData.get('phone') || '').trim() || null,
        objective: String(formData.get('objective') || '').trim() || null,
        status: String(formData.get('status') || 'new').trim(),
        temperature: String(formData.get('temperature') || 'warm').trim(),
        next_follow_up_at:
            String(formData.get('next_follow_up_at') || '').trim() || null,
        notes: String(formData.get('notes') || '').trim() || null,
    }

    const { error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', id)
        .eq('trainer_id', user.id)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/dashboard/contacts')
    return { ok: true }
}

export async function archiveContact(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('contacts')
        .update({ is_archived: true })
        .eq('id', id)

    if (error) {
        console.error('Error archiving contact:', error)
    }

    revalidatePath('/dashboard/contacts')
}