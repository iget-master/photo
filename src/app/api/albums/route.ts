// app/api/albums/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import cuid from "cuid";

export const runtime = 'nodejs'


export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await prisma.album.findMany({
        where: { photographerId: session.user.id },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { photos: true } } },
    })

    const data = rows.map(a => ({
        id: a.id,
        albumName: a.albumName,
        photoCount: a._count.photos,
        visitCount: a.visitCount,
        soldPhotos: a.soldPhotos,
        totalSoldValueCents: a.totalSoldValueCents,
        coverPhotoUrl: a.coverPhotoUrl ?? null,
        pricePerPhotoCents: a.pricePerPhotoCents,
        createdAt: a.createdAt,
    }))

    return NextResponse.json(data)
}

/**
 * Converte "12,34" (pt-BR) para centavos (1234).
 * Lança erro se input for inválido.
 */
function brlToCentsStrict(brl: unknown): number {
    if (typeof brl !== 'string') {
        throw new Error('pricePerPhotoBRL ausente ou inválido (string esperada).')
    }
    const trimmed = brl.trim()
    if (!trimmed) {
        throw new Error('pricePerPhotoBRL é obrigatório.')
    }
    // aceita "." como separador de milhar e "," como decimal
    const normalized = trimmed.replace(/\./g, '').replace(',', '.')
    const n = Number(normalized)
    if (!Number.isFinite(n)) {
        throw new Error('pricePerPhotoBRL inválido.')
    }
    const cents = Math.round(n * 100)
    if (cents < 0) {
        throw new Error('pricePerPhotoBRL não pode ser negativo.')
    }
    return cents
}

/**
 * POST /api/albums
 * Body:
 * {
 *   albumName: string                     (obrigatório)
 *   pricePerPhotoBRL: string              (obrigatório, pt-BR "12,34")
 *   photoIds?: string[]                   (opcional - associar fotos órfãs)
 *   coverPhotoUrl?: string | null         (opcional)
 * }
 */
export async function POST(req: Request) {
    try {
        // --- autenticação ---
        const session = await getServerSession(authOptions)
        const photographerId = session?.user?.id
        if (!photographerId) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
        }

        const body = await req.json()
        const {
            id,
            albumName,
            pricePerPhotoBRL,
            photoIds,
            coverPhotoUrl,
        }: {
            id?: string,
            albumName?: string
            pricePerPhotoBRL?: string
            photoIds?: string[]
            coverPhotoUrl?: string | null
        } = body ?? {}

        if (typeof albumName !== 'string' || albumName.trim().length < 1) {
            return NextResponse.json({ error: 'albumName é obrigatório.' }, { status: 400 })
        }

        if (typeof id !== 'string' || !cuid.isCuid(id)) {
            return NextResponse.json({ error: 'é obrigatório fornecer um cuid válido' }, { status: 400 })
        }

        let pricePerPhotoCents: number
        try {
            pricePerPhotoCents = brlToCentsStrict(pricePerPhotoBRL)
        } catch (err: any) {
            return NextResponse.json({ error: err?.message ?? 'pricePerPhotoBRL inválido.' }, { status: 400 })
        }

        // --- cria álbum ---
        const album = await prisma.album.create({
            data: {
                id,
                albumName: albumName.trim(),
                pricePerPhotoCents,
                coverPhotoUrl: typeof coverPhotoUrl === 'string' ? coverPhotoUrl : coverPhotoUrl ?? null,
                photographerId, // 👈 grava o dono
            },
            select: { id: true },
        })

        // --- associa fotos órfãs ao novo álbum, se fornecidas ---
        if (Array.isArray(photoIds) && photoIds.length > 0) {
            await prisma.photo.updateMany({
                where: { id: { in: photoIds } },
                data: { albumId: album.id },
            })

            // Se coverPhotoUrl foi OMITIDO (undefined) e existem fotos, define a capa como a 1ª enviada
            if (typeof coverPhotoUrl === 'undefined') {
                const first = await prisma.photo.findFirst({
                    where: { id: { in: photoIds } },
                    orderBy: { createdAt: 'asc' },
                    select: { url: true },
                })
                if (first?.url) {
                    await prisma.album.update({
                        where: { id: album.id },
                        data: { coverPhotoUrl: first.url },
                    })
                }
            }
        }

        return NextResponse.json({ id: album.id }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Erro ao criar álbum.' }, { status: 500 })
    }
}