// app/checkout/[id]/page.tsx
import prisma from '@/lib/prisma'
import CheckoutClient from './client'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default async function CheckoutPage(
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const order = await prisma.order.findUnique({
        where: { id: id },
        include: { album: { select: { albumName: true } }, items: true },
    })
    if (!order) notFound()

    return (
        <div className="mx-auto max-w-3xl p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Pagamento — {order.album.albumName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                        {order.items.length} foto(s) — Total: <b>{brl.format(order.totalCents / 100)}</b>
                    </div>
                    <CheckoutClient orderId={order.id} totalBRL={order.totalCents / 100} />
                </CardContent>
            </Card>
        </div>
    )
}
