export default function AppSection({
    children,
    className = '',
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`rounded-xl border border-border bg-muted/30 ${className}`}>
            {children}
        </div>
    )
}
