import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recomputeAlbumStatsByOrderId } from '@/lib/album-stats'
import { Resend } from 'resend'

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
        select: {
            id: true,
            status: true,
            customerEmail: true,
            totalCents: true,
            paymentMethod: true,
            album: {
                select: {
                    id: true,
                    albumName: true,
                    photographer: { select: { name: true } }
                }
            },
            _count: {
                select: { items: true },
            },
        },
    })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (order.status !== 'PAID') {
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAID', paidAt: new Date() },
        })
    }

    await recomputeAlbumStatsByOrderId(order.id)

    const { render } = await import('@react-email/render')
    const resend = new Resend(process.env.RESEND_API_KEY!)
    const OrderApproved = (await import('@/emails/OrderApproved')).default

    const html = await render(OrderApproved({ order }))

    const r = await resend.emails.send({
        from: process.env.FROM_EMAIL!,
        to: order.customerEmail!,
        subject: 'Suas fotos estão disponíveis',
        html,
    })

    console.log(r);

    return NextResponse.json({ ok: true })
}
