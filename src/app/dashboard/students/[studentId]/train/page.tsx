import { redirect } from 'next/navigation'

type PageProps = {
    params: Promise<{ studentId: string }>
}

export default async function RetiredTrainerWorkoutPage({ params }: PageProps) {
    const { studentId } = await params
    redirect(`/dashboard/students/${studentId}`)
}
