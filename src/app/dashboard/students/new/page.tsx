import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createStudent } from '@/app/dashboard/students/actions'

export default async function NewStudentPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = await props.searchParams
    const message = searchParams?.message

    return (
        <div className="p-8 max-w-2xl">
            <div className="mb-6">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
                <h1 className="text-5xl font-extrabold text-blue-600 underline">
                    TEST TAILWIND
                </h1>
                <p className="text-sm text-zinc-400 mt-1">Create a profile for your new client.</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
                <form className="space-y-6" action={createStudent}>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="first_name" className="text-sm font-medium leading-none text-zinc-300">
                                First Name
                            </label>
                            <input
                                id="first_name"
                                name="first_name"
                                type="text"
                                required
                                className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                                placeholder="Jane"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="last_name" className="text-sm font-medium leading-none text-zinc-300">
                                Last Name
                            </label>
                            <input
                                id="last_name"
                                name="last_name"
                                type="text"
                                required
                                className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium leading-none text-zinc-300">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                            placeholder="jane.doe@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="active_plan" className="text-sm font-medium leading-none text-zinc-300">
                            Initial Plan Status
                        </label>
                        <select
                            id="active_plan"
                            name="active_plan"
                            className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                            defaultValue="active"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {message && (
                        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                            {message}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-500 px-8 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                        >
                            Create Student
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
