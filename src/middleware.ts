import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const plan = req.nextauth.token?.subscriptionPlan;

    // Routes réservées aux abonnés PRO
    const proRoutes = ['/strategies', '/agent'];
    const isProRoute = proRoutes.some((r) => pathname.startsWith(r));

    if (isProRoute && plan !== 'PRO') {
      const url = req.nextUrl.clone();
      url.pathname = '/upgrade';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Toutes les routes du matcher requièrent une connexion
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/market/:path*',
    '/portfolio/:path*',
    '/strategies/:path*',
    '/agent/:path*',
    '/upgrade/:path*',
  ],
};
