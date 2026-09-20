import Link from 'next/link'

type LegalSection = {
    title: string
    paragraphs?: string[]
    items?: string[]
}

export default function LegalPage({
    title,
    description,
    updatedAt,
    sections,
}: {
    title: string
    description: string
    updatedAt: string
    sections: LegalSection[]
}) {
    return (
        <main className="min-h-screen bg-[#07070a] px-4 py-8 text-zinc-100 sm:py-12">
            <article className="mx-auto max-w-2xl">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300">
                    <span aria-hidden>←</span> Progrezzia
                </Link>

                <header className="mt-8 border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-black tracking-tight">{title}</h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">{description}</p>
                    <p className="mt-3 text-xs text-zinc-500">Última actualización: {updatedAt}</p>
                </header>

                <div className="space-y-8 py-8">
                    {sections.map((section) => (
                        <section key={section.title}>
                            <h2 className="text-lg font-bold">{section.title}</h2>
                            {section.paragraphs?.map((paragraph) => (
                                <p key={paragraph} className="mt-3 text-sm leading-6 text-zinc-400">
                                    {paragraph}
                                </p>
                            ))}
                            {section.items && (
                                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400">
                                    {section.items.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>

                <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 py-6 text-xs text-zinc-500">
                    <Link href="/privacy" className="hover:text-zinc-200">Privacidad</Link>
                    <Link href="/terms" className="hover:text-zinc-200">Términos</Link>
                    <Link href="/support" className="hover:text-zinc-200">Soporte</Link>
                    <Link href="/account-deletion" className="hover:text-zinc-200">Eliminar cuenta</Link>
                </footer>
            </article>
        </main>
    )
}
