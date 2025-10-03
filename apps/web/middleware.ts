import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROLES = new Set(['admin','org_admin','reviewer','finance','auditor']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('role')?.value || 'anon';
  const authed = !!request.cookies.get('sb-access-token');

  // RBAC enforcement
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

  const response = NextResponse.next();

  // Skip static assets
  if (pathname.startsWith('/_next/')) return response;

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (pathname.startsWith('/checkout') || pathname.startsWith('/orders/confirmation')) {
    response.headers.set('Content-Security-Policy',
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
    response.headers.set('Content-Security-Policy',
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
  matcher: ['/admin/:path*','/portal/:path*','/checkout/:path*','/orders/confirmation/:path*','/((?!api|_next|favicon.ico|.*\\.).*)']
};
