import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import PWARegister from '@/components/PWARegister'
import NativeAppBridge from '@/components/mobile/NativeAppBridge'
import { APPEARANCES } from '@/lib/appearance'
import { getAppearance } from '@/lib/serverAppearance'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Progrezzia',
  description: 'Entrenamiento, seguimiento y progreso para alumnos y entrenadores personales.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
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

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: APPEARANCES[await getAppearance()].background }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const appearance = await getAppearance()
  const colorScheme = appearance === 'light' ? 'light' : 'dark'

  return (
    <html lang="es" className={colorScheme} data-appearance={appearance} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <PWARegister />
        <NativeAppBridge appearance={appearance} />
        {children}
      </body>
    </html>
  )
}
