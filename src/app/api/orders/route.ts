import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const body = await req.json() as {
            albumId?: string
            photoIds?: string[]
            customerCpf?: string
            customerEmail?: string
        }

        const albumId = body.albumId?.trim()
        const photoIds = Array.isArray(body.photoIds) ? body.photoIds : []
        const customerCpf = (body.customerCpf ?? '').replace(/\D/g, '') || null
        const customerEmail = body.customerEmail?.trim().toLowerCase() || null

        if (!albumId) {
            return NextResponse.json({ error: 'albumId é obrigatório.' }, { status: 400 })
        }
        if (!photoIds.length) {
            return NextResponse.json({ error: 'Selecione ao menos uma foto.' }, { status: 400 })
        }
        if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
            return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
        }
        if (!customerCpf || customerCpf.length !== 11) {
            return NextResponse.json({ error: 'CPF inválido (11 dígitos).' }, { status: 400 })
        }

        // pega o preço do álbum
        const album = await prisma.album.findUnique({
            where: { id: albumId },
            select: { id: true, pricePerPhotoCents: true },
        })
        if (!album) return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })

        const unit = album.pricePerPhotoCents ?? 0

        // garante que todas as fotos pertencem ao álbum
        const photos = await prisma.photo.findMany({
            where: { id: { in: photoIds }, albumId },
            select: { id: true },
        })
        if (photos.length !== photoIds.length) {
            return NextResponse.json({ error: 'Alguma foto não pertence a este álbum.' }, { status: 400 })
        }

        const totalCents = unit * photos.length

        const order = await prisma.$transaction(async (tx) => {
            const created = await tx.order.create({
                data: {
                    albumId,
                    customerCpf,
                    customerEmail, // <— salva e-mail
                    totalCents,
                    status: 'PENDING',
                    paymentMethod: 'PIX', // se tiver outras formas, ajuste no client antes de criar
                    items: {
                        create: photos.map((p) => ({
                            photoId: p.id,
                            unitPriceCents: unit,
                        })),
                    },
                },
                select: { id: true },
            })
            return created
        })

        return NextResponse.json({ orderId: order.id })
    } catch {
        return NextResponse.json({ error: 'Falha ao criar o pedido.' }, { status: 500 })
    }
}
