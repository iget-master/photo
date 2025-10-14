// app/api/photos/[photoId]/process/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { makeThumb, makeWatermark } from '@/lib/imaging'
import { uploadBufferToBlob } from '@/lib/blob'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, context: { params: Promise<{ photoId: string }> }) {
    const { photoId } = await context.params

    const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { id: true, albumId: true, url: true, urlWatermark: true, urlThumb: true },
    })
    if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!photo.url) return NextResponse.json({ error: 'Foto sem original' }, { status: 400 })

    // baixa original do blob
    const res = await fetch(photo.url)
    if (!res.ok) return NextResponse.json({ error: 'Falha ao baixar original' }, { status: 502 })
    const buf = Buffer.from(await res.arrayBuffer())

    const [wmBuf, thBuf] = await Promise.all([makeWatermark(buf), makeThumb(buf)])

    const prefix = photo.albumId ? `albums/${photo.albumId}/` : undefined
    const [wmUrl, thUrl] = await Promise.all([
        uploadBufferToBlob(wmBuf, prefix),
        uploadBufferToBlob(thBuf, prefix),
    ])

    const updated = await prisma.photo.update({
        where: { id: photoId },
        data: { urlWatermark: wmUrl, urlThumb: thUrl },
        select: { id: true, urlWatermark: true, urlThumb: true },
    })

    return NextResponse.json({ ok: true, photo: updated })
}
