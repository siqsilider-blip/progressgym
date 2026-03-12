import Link from 'next/link'
import { Dumbbell, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-100">
      <header className="flex h-16 items-center justify-between border-b border-zinc-800/50 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-500/20">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">ProgressGym</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="flex flex-col items-center justify-center pt-32 pb-20 text-center px-4">
          <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-300 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2"></span>
            The Modern Tool for Personal Trainers
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl bg-gradient-to-br from-zinc-100 to-zinc-500 bg-clip-text text-transparent pb-4">
            Manage your students & scale your fitness business
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-zinc-400">
            ProgressGym is the ultimate SaaS platform designed specifically for personal trainers.
            Track workouts, manage students, and grow your coaching business—all in one place.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center justify-center rounded-full bg-indigo-500 px-8 text-base font-medium text-white transition-all hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 shadow-xl shadow-indigo-500/20"
            >
              Start for free
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
