import { redirect } from 'next/navigation'

export default function StudentSignupPage() {
    redirect('/login?message=Tu entrenador debe enviarte una invitación para crear tu acceso.')
}
