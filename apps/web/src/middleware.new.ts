import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';

// Define protected routes
const protectedRoutes = {
  admin: ['/admin'],
  customer: ['/dashboard', '/quotes', '/orders'],
  public: ['/login', '/widget'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes, static files, and public assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const user = await getUser(request);

  // Check if route requires authentication
  const isAdminRoute = protectedRoutes.admin.some(route => pathname.startsWith(route));
  const isCustomerRoute = protectedRoutes.customer.some(route => pathname.startsWith(route));
  const isProtectedRoute = isAdminRoute || isCustomerRoute;

  // Redirect to login if not authenticated and trying to access protected route
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check role-based access
  if (user) {
    if (isAdminRoute && user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    if (isCustomerRoute && user.role !== 'customer') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Redirect authenticated users away from login page
    if (pathname === '/login') {
      const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // Redirect root path based on user role
    if (pathname === '/') {
      const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  } else {
    // Redirect unauthenticated users from root to login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
