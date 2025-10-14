// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { baseUrl } from './lib/base-url'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Protect cron jobs with CRON_SECRET
    if (pathname.startsWith('/api/cron')) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', {
                status: 401,
            });
        }

        return NextResponse.next();
    }

    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico' ||
        pathname === '/'
    ) {
        return NextResponse.next()
    }

    const token = await getToken({ req: request })
    if (!token) {
        const url = new URL('/login', baseUrl)
        url.searchParams.set('callbackUrl', request.nextUrl.href)
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/albums/:path*',
        '/photographers/:path*',
        '/checkout/:path*',
        '/admin/:path*',
    ],
}
