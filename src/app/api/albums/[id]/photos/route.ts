// app/api/albums/[id]/photos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

type Body = {
    photos: Array<{
        url: string
        sizeBytes?: number | null
        originalName?: string | null
    }>
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // <- params é Promise
) {
    try {
        const { id: albumId } = await context.params // <- aguarda aqui
        const { photos }: Body = await req.json()

        if (!albumId) {
            return NextResponse.json({ error: 'Album ID ausente.' }, { status: 400 })
        }
        if (!Array.isArray(photos) || photos.length === 0) {
            return NextResponse.json({ photos: [] }, { status: 201 })
        }

        // cria em transação
        const created = await prisma.$transaction(
            photos.map((p) =>
                prisma.photo.create({
                    data: {
                        albumId,
                        url: p.url,
                        sizeBytes: p.sizeBytes ?? null,
                        originalName: p.originalName ?? null,
                    },
                }),
            ),
        )

        // busca os criados já ordenados por createdAt desc
        const rows = await prisma.photo.findMany({
            where: { id: { in: created.map((c) => c.id) } },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                url: true,
                sizeBytes: true,
                originalName: true,
                createdAt: true,
            },
        })

        return NextResponse.json({ photos: rows }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Erro ao salvar fotos.' }, { status: 500 })
    }
}
