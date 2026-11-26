import DashboardBackButton from '@/components/dashboard/DashboardBackButton'

export default function BackButton() {
    return (
        <DashboardBackButton
            fallbackHref="/dashboard/routines"
            iconOnly
            className="lg:h-7 lg:w-7 lg:rounded-md lg:border-transparent lg:bg-transparent lg:text-muted-foreground lg:hover:bg-muted lg:hover:text-foreground"
        />
    )
}
