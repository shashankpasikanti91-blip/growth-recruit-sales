import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/auth',
  '/invite',
  '/favicon.ico',
  '/_next',
  '/api',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  const accessToken = request.cookies.get('access_token')?.value;
  if (!accessToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Only preserve redirect for safe relative paths
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

function setSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
