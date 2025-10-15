// app/api/photos/[photoId]/download/route.ts
import prisma from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

function sanitizeFilename(name: string) {
    return name.replace(/[\\\/:*?"<>|\r\n]/g, '_').slice(0, 180)
}

export async function GET(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params

    const photo = await prisma.photo.findUnique({
        where: { id },
        select: { id: true, url: true, originalName: true },
    })
    if (!photo?.url) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const upstream = await fetch(photo.url)
    if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 })
    }

    let ext = 'jpg'
    try {
        const path = new URL(photo.url).pathname
        const maybe = path.split('.').pop() || ''
        if (maybe && maybe.length <= 5) ext = maybe
    } catch {}

    const name =
        sanitizeFilename(photo.originalName?.trim() || `${photo.id}.${ext}`)

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${name}"`)

    const length = upstream.headers.get('content-length')
    if (length) headers.set('Content-Length', length)
    headers.set('Cache-Control', 'private, max-age=300')

    return new NextResponse(upstream.body as any, { headers })
}
