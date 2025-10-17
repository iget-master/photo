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
        include: { album: { select: { id: true, photographerId: true, coverPhotoUrl: true } } },
    })
    if (!photo || !photo.album || photo.album.photographerId !== (session.user as any).id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const result = prisma.$transaction(async(transaction) => {
        if (photo.url === photo.album?.coverPhotoUrl) {
            await transaction.album.update({
                where: { id: photo.album.id },
                data: { coverPhotoUrl: null }
            })
        }

        const salesCount = await transaction.orderItem.count({
            where: { photoId }
        })

        if (salesCount) {
            await transaction.photo.update({where: { id: photoId }, data: { deletedAt: new Date() }})
        } else {
            await transaction.photo.delete({ where: { id: photoId } })
        }
    })

    const urls = [photo.url as string | null, photo.urlWatermark, photo.urlThumb].filter(Boolean) as string[]
    await Promise.all(urls.map(async (u) => { try { await del(u) } catch {} }))

    return NextResponse.json({ ok: true })
}