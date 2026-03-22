import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ProgressGym',
  description: 'SaaS for personal trainers',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const theme =
    cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen ${theme === 'light'
            ? 'bg-zinc-100 text-zinc-900'
            : 'bg-zinc-950 text-zinc-50'
          }`}
      >
        {children}
      </body>
    </html>
  )
}