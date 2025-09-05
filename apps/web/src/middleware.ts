import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Handle widget endpoints
  if (request.nextUrl.pathname.startsWith('/widget')) {
    const origin = request.headers.get('origin')

    if (origin) {
      // Check if origin is allowed
      const { data: widgetOrigin } = await supabase
        .from('widget_origins')
        .select('active')
        .eq('origin', origin)
        .eq('active', true)
        .maybeSingle()

      if (widgetOrigin) {
        // Set CORS headers for allowed origins
        res.headers.set('Access-Control-Allow-Origin', origin)
        res.headers.set('Access-Control-Allow-Methods', 'GET, POST')
        res.headers.set('Access-Control-Allow-Headers', 'Content-Type')

        // Set CSP headers to allow iframe embedding
        res.headers.set(
          'Content-Security-Policy',
          `frame-ancestors ${origin};`
        )
      } else {
        // Block disallowed origins
        return new NextResponse(null, { status: 403 })
      }
    }

    return res
  }

  // Legacy widget redirects - redirect old widget routes to new instant quote
  const legacyRoutes = [
    '/widget/quote',
    '/widget/instant-quote',
    '/embed/quote',
    '/embed/instant-quote'
  ];

  if (legacyRoutes.includes(request.nextUrl.pathname)) {
    const url = new URL('/instant-quote', request.url);

    // Preserve query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    // Add embed parameter if coming from legacy embed routes
    if (request.nextUrl.pathname.startsWith('/embed/')) {
      url.searchParams.set('embed', 'true');
    } else {
      url.searchParams.set('embed', 'true');
    }

    return NextResponse.redirect(url);
  }

  // Legacy help/support redirects
  if (request.nextUrl.pathname === '/support') {
    return NextResponse.redirect(new URL('/help', request.url));
  }

  if (request.nextUrl.pathname === '/help-center') {
    return NextResponse.redirect(new URL('/help', request.url));
  }

  if (request.nextUrl.pathname.startsWith('/faq')) {
    return NextResponse.redirect(new URL('/help', request.url));
  }

  // Protect /admin and /portal routes
  if (
    (request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/portal')) &&
    !session
  ) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Required org_id check for protected routes
  if (session?.user && !session.user.user_metadata.org_id) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  return res
}
