import * as React from 'react'

type AppInputProps = React.InputHTMLAttributes<HTMLInputElement>

export default function AppInput({
    className = '',
    ...props
}: AppInputProps) {
    return (
        <input
            {...props}
            className={`w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground ${className}`}
        />
    )
}