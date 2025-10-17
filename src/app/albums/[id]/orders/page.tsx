// app/albums/[id]/orders/page.tsx
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {notFound, redirect} from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ApproveButton from './approve-button'
import BackButton from "@/components/BackButton";

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default async function AlbumOrdersPage(
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/auth/signin')

    const album = await prisma.album.findFirst({
        where: { id: id, photographerId: session.user.id },
        select: { id: true, albumName: true },
    })
    if (!album) return notFound();

    const orders = await prisma.order.findMany({
        where: { albumId: album.id },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
    });

    if (!orders) return notFound();

    return (
        <div className="mx-auto max-w-6xl p-6 space-y-6">
            <div className="flex items-center gap-2">
                <BackButton />
                <h1 className="text-xl font-semibold">Pedidos do álbum</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Compras — {album.albumName}</CardTitle>
                </CardHeader>
                <CardContent>
                    {orders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma compra ainda.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pedido</TableHead>
                                    <TableHead className="text-right">Fotos</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((o) => (
                                    <TableRow key={o.id}>
                                        <TableCell className="font-mono text-xs">{o.id}</TableCell>
                                        <TableCell className="text-right">{o.items.length}</TableCell>
                                        <TableCell className="text-right">{brl.format(o.totalCents / 100)}</TableCell>
                                        <TableCell>{o.customerCpf ? o.customerCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'}</TableCell>
                                        <TableCell>
                                            {o.status === 'PENDING' && 'Pendente'}
                                            {o.status === 'PAID' && 'Pago'}
                                            {o.status === 'CANCELED' && 'Cancelado'}
                                            {o.status === 'EXPIRED' && 'Expirado'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {o.status === 'PENDING' ? <ApproveButton orderId={o.id} /> : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
