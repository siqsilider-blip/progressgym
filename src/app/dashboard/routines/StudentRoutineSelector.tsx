'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Student = {
    id: string
    first_name: string
    last_name: string
}

type Props = {
    students: Student[]
    selectedStudentId: string
}

function getInitials(first: string, last: string): string {
    const f = first.trim().charAt(0).toUpperCase()
    const l = last.trim().charAt(0).toUpperCase()
    return `${f}${l}` || '?'
}

const AVATAR_COLORS = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-violet-500',
    'bg-orange-500',
    'bg-teal-500',
]

function getAvatarColor(id: string): string {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function StudentRoutineSelector({
    students,
    selectedStudentId,
}: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)

    const selectedStudent = students.find((s) => s.id === selectedStudentId)

    const selectedName = selectedStudent
        ? `${selectedStudent.first_name} ${selectedStudent.last_name}`.trim()
        : ''

    const filteredStudents = useMemo(() => {
        if (!search.trim()) return students
        const q = search.toLowerCase()
        return students.filter((s) => {
            const name = `${s.first_name} ${s.last_name}`.toLowerCase()
            return name.includes(q)
        })
    }, [students, search])

    useEffect(() => {
        if (open) {
            setTimeout(() => searchInputRef.current?.focus(), 100)
        } else {
            setSearch('')
        }
    }, [open])

    // Cerrar con Escape
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [open])

    const handleSelect = (id: string) => {
        setOpen(false)
        router.push(`/dashboard/routines?studentId=${id}`)
    }

    return (
        <>
            {/* Trigger button */}
            <div>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition hover:bg-muted/50"
                >
                    {selectedStudent ? (
                        <>
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${getAvatarColor(selectedStudent.id)}`}>
                                {getInitials(selectedStudent.first_name, selectedStudent.last_name)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-card-foreground">
                                    {selectedName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    Toca para cambiar
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border">
                                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-muted-foreground">
                                    Seleccionar alumno
                                </p>
                            </div>
                        </>
                    )}

                    <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Modal overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                >
                    {/* Bottom sheet */}
                    <div
                        className="w-full max-w-lg animate-[slideUp_0.25s_ease-out] rounded-t-3xl border-t border-border bg-background shadow-2xl"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="h-1 w-10 rounded-full bg-border" />
                        </div>

                        {/* Header + search */}
                        <div className="px-5 pt-2 pb-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-card-foreground">
                                    Elegir alumno
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {students.length > 5 && (
                                <div className="mt-3">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Buscar alumno..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Student list */}
                        <div className="max-h-[55vh] overflow-y-auto px-3 pb-4">
                            {filteredStudents.length === 0 ? (
                                <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                                    {search ? 'Sin resultados' : 'No hay alumnos'}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredStudents.map((student) => {
                                        const name = `${student.first_name} ${student.last_name}`.trim() || 'Sin nombre'
                                        const isSelected = student.id === selectedStudentId
                                        const initials = getInitials(student.first_name, student.last_name)
                                        const color = getAvatarColor(student.id)

                                        return (
                                            <button
                                                key={student.id}
                                                type="button"
                                                onClick={() => handleSelect(student.id)}
                                                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${isSelected
                                                        ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30'
                                                        : 'hover:bg-muted/60'
                                                    }`}
                                            >
                                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${color}`}>
                                                    {initials}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className={`truncate text-sm font-semibold ${isSelected
                                                            ? 'text-indigo-600 dark:text-indigo-400'
                                                            : 'text-card-foreground'
                                                        }`}>
                                                        {name}
                                                    </p>
                                                </div>

                                                {isSelected && (
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                                                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Slide-up animation */}
            <style jsx global>{`
                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    )
}