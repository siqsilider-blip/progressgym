export default function AppSection({
    children,
    className = '',
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`rounded-2xl border border-border bg-muted/40 ${className}`}>
            {children}
        </div>
    )
}