import type { CapacitorConfig } from '@capacitor/cli'

const PRODUCTION_URL = 'https://progressgym-sigma.vercel.app'

function resolveServerTarget() {
  const requestedUrl = process.env.CAPACITOR_SERVER_URL?.trim()
  const devServerEnabled = process.env.CAPACITOR_DEV_SERVER === '1'

  if (!devServerEnabled || !requestedUrl) {
    return { url: PRODUCTION_URL, cleartext: false }
  }

  let parsed: URL
  try {
    parsed = new URL(requestedUrl)
  } catch {
    throw new Error('CAPACITOR_SERVER_URL debe ser una URL válida.')
  }

  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('CAPACITOR_SERVER_URL debe contener solo el origen, sin credenciales, ruta, query ni hash.')
  }

  const localDevelopmentHosts = new Set(['localhost', '127.0.0.1', '[::1]', '10.0.2.2'])
  const isLocalHttp = parsed.protocol === 'http:' && localDevelopmentHosts.has(parsed.hostname)
  if (parsed.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('El servidor nativo debe usar HTTPS; HTTP solo se permite en un host local de desarrollo.')
  }

  return { url: parsed.origin, cleartext: isLocalHttp }
}

const serverTarget = resolveServerTarget()

const config: CapacitorConfig = {
  appId: 'app.progrezzia.mobile',
  appName: 'Progrezzia',
  webDir: 'native-shell',
  backgroundColor: '#111111',
  loggingBehavior: 'none',
  server: {
    // Progrezzia depende de Server Components, Server Actions y cookies de
    // Supabase. El contenedor conserva ese backend en lugar de duplicar la app.
    url: serverTarget.url,
    cleartext: serverTarget.cleartext,
    appStartPath: '/native',
    errorPath: 'offline.html',
  },
  android: {
    backgroundColor: '#111111',
    loggingBehavior: 'none',
  },
  ios: {
    backgroundColor: '#111111',
    contentInset: 'never',
    loggingBehavior: 'none',
  },
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
      autoBackdropColor: 'dom',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_progrezzia',
      iconColor: '#C98796',
      presentationOptions: ['sound', 'banner', 'list'],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#111111',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#111111',
    },
  },
}

export default config
