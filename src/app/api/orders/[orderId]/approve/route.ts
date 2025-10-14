// app/api/orders/[orderId]/approve/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recomputeAlbumStatsByOrderId } from '@/lib/album-stats'

export const runtime = 'nodejs'

export async function PATCH(
    _req: Request,
    context: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await context.params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
    })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (order.status !== 'PAID') {
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAID', paidAt: new Date() },
        })
    }

    await recomputeAlbumStatsByOrderId(order.id)

    return NextResponse.json({ ok: true })
}
