import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_ROLES = new Set(['admin','org_admin','reviewer','finance','auditor']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes - they handle their own authentication
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Prepare a response object we can mutate (cookies/headers)
  let response = NextResponse.next({ request });

  // Initialize Supabase SSR client for session/cookies management
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Handle widget endpoints with CORS + CSP
  if (pathname.startsWith('/widget')) {
    const origin = request.headers.get('origin');
    if (origin) {
      const { data: widgetOrigin } = await supabase
        .from('widget_origins')
        .select('active')
        .eq('origin', origin)
        .eq('active', true)
        .maybeSingle();

      if (widgetOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        response.headers.set('Content-Security-Policy', `frame-ancestors ${origin};`);
      } else {
        return new NextResponse(null, { status: 403 });
      }
    }
    return response;
  }

  // Legacy widget redirects to new instant quote
  const legacyRoutes = [
    '/widget/quote',
    '/widget/instant-quote',
    '/embed/quote',
    '/embed/instant-quote',
  ];
  if (legacyRoutes.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/instant-quote';
    // Preserve all query params and mark embed=true
    request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
    url.searchParams.set('embed', 'true');
    return NextResponse.redirect(url);
  }

  // Additional legacy redirects
  if (pathname === '/support') {
    const url = request.nextUrl.clone();
    url.pathname = '/help';
    return NextResponse.redirect(url);
  }
  if (pathname === '/help-center' || pathname.startsWith('/faq')) {
    const url = request.nextUrl.clone();
    url.pathname = '/help';
    return NextResponse.redirect(url);
  }

  // RBAC + auth enforcement
  const role = request.cookies.get('role')?.value || 'anon';
  const authed = !!request.cookies.get('sb-access-token');

  if (pathname.startsWith('/admin')) {
    if (!authed || !ADMIN_ROLES.has(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/403';
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith('/portal')) {
    if (!authed) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/sign-in';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Required org_id check (if authenticated)
  if (session?.user && !session.user.user_metadata.org_id) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    return NextResponse.redirect(url);
  }

  // Skip static assets
  if (pathname.startsWith('/_next/')) return response;

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CSP
  if (pathname.startsWith('/checkout') || pathname.startsWith('/orders/confirmation')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.paypal.com https://api-m.paypal.com https://api.sandbox.paypal.com https://api-m.sandbox.paypal.com; " +
        "frame-src https://www.paypal.com https://www.sandbox.paypal.com; " +
        "object-src 'none'; base-uri 'self'; form-action 'self';"
    );
  } else {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com https://*.googleadservices.com https://*.doubleclick.net https://*.facebook.net https://*.apollo.io https://*.clarity.ms https://*.hubspot.com https://*.hsforms.net https://*.hs-analytics.net https://*.hs-banner.com https://*.hscollectedforms.net https://*.hsadspixel.net https://*.lfeeder.com https://*.cloudflareinsights.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https: wss: https://*.googletagmanager.com https://*.google-analytics.com https://*.facebook.net https://*.apollo.io https://*.aplo-evnt.com; " +
        "frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';"
    );
  }

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/portal/:path*',
    '/checkout/:path*',
    '/orders/confirmation/:path*',
    '/widget/:path*',
    '/embed/:path*',
    '/support',
    '/help-center',
    '/faq/:path*',
    '/((?!api|_next|favicon.ico|.*\\.).*)',
  ],
};
