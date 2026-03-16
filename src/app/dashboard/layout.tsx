import Sidebar from '@/components/Sidebar'
import { getTrainerProfile } from '@/lib/getTrainerProfile'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const trainerProfile = await getTrainerProfile()

    return (
        <div className="flex min-h-screen bg-zinc-950">
            <Sidebar />

            <main className="w-full flex-1 overflow-y-auto">
                <div
                    data-display-name={trainerProfile?.display_name ?? ''}
                    data-gym-name={trainerProfile?.gym_name ?? ''}
                    data-weight-unit={trainerProfile?.weight_unit ?? 'kg'}
                    data-default-routine-days={
                        trainerProfile?.default_routine_days ?? 4
                    }
                >
                    {children}
                </div>
            </main>
        </div>
    )
}