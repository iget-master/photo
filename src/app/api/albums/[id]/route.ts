import {NextRequest, NextResponse} from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const {id} = await context.params;

    const album = await prisma.album.findUnique({
        where: { id },
        include: {
            photos: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                select: { id: true, url: true, sizeBytes: true, originalName: true, createdAt: true },
            },
        },
    })

    if (!album) return NextResponse.json({ error: 'Álbum não encontrado' }, { status: 404 })

    return NextResponse.json({
        id: album.id,
        albumName: album.albumName,
        pricePerPhotoCents: album.pricePerPhotoCents ?? null,
        coverPhotoUrl: album.coverPhotoUrl ?? null, // 👈 agora vem direto do model
        photos: album.photos,
    })
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // <- params é Promise
) {
    const { id } = await context.params;
    const { albumName, pricePerPhotoBRL, coverPhotoUrl } = (await req.json()) as {
        albumName?: string
        pricePerPhotoBRL?: string
        coverPhotoUrl?: string | null // string (url), null (limpar), undefined (não mexe)
    }

    const toCents = (s?: string | null) => {
        if (!s) return null
        const n = Number(String(s).replace(/\./g, '').replace(',', '.'))
        if (Number.isNaN(n)) return null
        return Math.round(n * 100)
    }

    const data: any = {
        albumName: albumName ?? undefined,
        pricePerPhotoCents: toCents(pricePerPhotoBRL) ?? undefined,
    }

    if (coverPhotoUrl === null) data.coverPhotoUrl = null
    if (typeof coverPhotoUrl === 'string') data.coverPhotoUrl = coverPhotoUrl

    const updated = await prisma.album.update({
        where: { id },
        data,
        select: { id: true },
    })

    return NextResponse.json({ ok: true, id: updated.id })
}
