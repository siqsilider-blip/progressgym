import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Progrezzia',
  description: 'La herramienta para entrenadores personales que quieren gestionar alumnos, registrar sesiones y ver el progreso real.',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
  },
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Progrezzia" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}