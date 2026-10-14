import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // New management APIs always return JSON auth errors; authorization is re-read from DB.
    if (pathname.startsWith('/api/gestion/') && !token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Admin-only routes
    const adminRoutes = [
      '/dashboard/usuarios',
      '/api/users',
    ];

    const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

    if (isAdminRoute && token?.role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Public routes
        if (
          pathname === '/login' ||
          pathname === '/solicitar' ||
          (pathname === '/api/solicitudes' && req.method === 'POST') ||
          pathname.startsWith('/api/gestion/') ||
          pathname.startsWith('/api/auth') ||
          pathname === '/api/signup' ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon') ||
          pathname === '/ungrd-logo.png' ||
          pathname === '/og-image.png' ||
          pathname === '/robots.txt' ||
          pathname === '/'
        ) {
          return true;
        }

        // Require auth for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|og-image.png|robots.txt).*)',
  ],
};
