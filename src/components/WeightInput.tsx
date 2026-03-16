'use client'

import { type WeightUnit } from '@/lib/weight'

type WeightInputProps = {
    name: string
    label?: string
    defaultValue?: string | number
    unit: WeightUnit
    placeholder?: string
    required?: boolean
    className?: string
}

export default function WeightInput({
    name,
    label,
    defaultValue,
    unit,
    placeholder = '0',
    required = false,
    className = '',
}: WeightInputProps) {
    return (
        <div className={className}>
            {label ? (
                <label className="mb-1 block text-sm text-zinc-300">
                    {label}
                </label>
            ) : null}

            <div className="relative">
                <input
                    type="number"
                    name={name}
                    step="0.01"
                    min="0"
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    required={required}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 pr-12 text-zinc-100 outline-none focus:border-zinc-600"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    {unit}
                </span>
            </div>
        </div>
    )
}