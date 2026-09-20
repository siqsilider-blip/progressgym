import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const pathname = request.nextUrl.pathname

    // Las rutas públicas no necesitan validar ni refrescar una sesión. Evita
    // una llamada remota innecesaria en login, registro y health checks.
    const isPublicRoute =
        pathname === '/' ||
        pathname === '/login' ||
        pathname.startsWith('/login/') ||
        pathname === '/signup' ||
        pathname.startsWith('/signup/') ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password' ||
        pathname === '/privacy' ||
        pathname === '/terms' ||
        pathname === '/support' ||
        pathname === '/account-deletion' ||
        pathname === '/api/health' ||
        pathname.startsWith('/auth')

    if (isPublicRoute) return supabaseResponse

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data, error } = await supabase.auth.getClaims()
    const isAuthenticated = !error && Boolean(data?.claims?.sub)

    // Sin sesión en ruta protegida → login
    if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
