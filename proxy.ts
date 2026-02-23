/**
 * NovaNet – Proxy Middleware
 *
 * Protects authenticated routes and refreshes Supabase sessions.
 * Uses @supabase/ssr (modern pattern, no deprecated helpers).
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/feed', '/profile', '/messages', '/groups', '/settings', '/admin'];

// Routes only accessible when NOT authenticated
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Correct Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          response.cookies.set(name, value, options);
        },
        remove(name: string, options?: any) {
          response.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Protect authenticated routes
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Prevent authenticated users from accessing auth pages
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route)) && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/feed';
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Admin protection
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/feed';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|og-image.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};