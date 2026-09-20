import { redirect } from 'next/navigation'

export default function StudentSignupPage() {
    redirect('/login/student?message=Tu entrenador debe enviarte una invitación para crear tu acceso.')
}
