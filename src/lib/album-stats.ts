// lib/album-stats.ts
import prisma from '@/lib/prisma'

/**
 * Recalcula os agregados do álbum a partir de todos os pedidos PAID.
 * - soldPhotos: quantidade de OrderItem (cada item = 1 foto)
 * - totalSoldValueCents: soma de Order.totalCents (PAID)
 */
export async function recomputeAlbumStats(albumId: string) {
    return prisma.$transaction(async (tx) => {
        const paidOrders = await tx.order.findMany({
            where: { albumId, status: 'PAID' },
            select: { id: true, totalCents: true },
        })

        const orderIds = paidOrders.map((o) => o.id)
        const totalSoldValueCents = paidOrders.reduce((acc, o) => acc + o.totalCents, 0)

        const soldPhotos = orderIds.length
            ? await tx.orderItem.count({ where: { orderId: { in: orderIds } } })
            : 0

        await tx.album.update({
            where: { id: albumId },
            data: {
                totalSoldValueCents,
                soldPhotos,
            },
        })
    })
}

export async function recomputeAlbumStatsByOrderId(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { albumId: true },
    })
    if (order?.albumId) await recomputeAlbumStats(order.albumId)
}
