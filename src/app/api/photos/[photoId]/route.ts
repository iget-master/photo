import {NextRequest, NextResponse} from 'next/server'
import prisma from '@/lib/prisma'
import { del } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function DELETE(
    _req: NextRequest,
    context: { params: Promise<{ photoId: string }> }
) {
    const { photoId } = await context.params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: { album: { select: { photographerId: true } } },
    })
    if (!photo || !photo.album || photo.album.photographerId !== (session.user as any).id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.photo.delete({ where: { id: photoId } })

    const urls = [photo.url as string | null, photo.urlWatermark, photo.urlThumb].filter(Boolean) as string[]
    await Promise.all(urls.map(async (u) => { try { await del(u) } catch {} }))

    return NextResponse.json({ ok: true })
}