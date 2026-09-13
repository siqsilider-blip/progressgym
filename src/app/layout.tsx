import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Progrezzia',
  description: 'La herramienta para entrenadores personales que quieren gestionar alumnos, registrar sesiones y ver el progreso real.',
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Progrezzia',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
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
    <html lang="es" className={theme} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
