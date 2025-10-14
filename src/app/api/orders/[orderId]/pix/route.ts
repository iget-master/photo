import {NextRequest, NextResponse} from 'next/server'
import prisma from '@/lib/prisma'
import { nanoid } from 'nanoid'

export const runtime = 'nodejs'

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ orderId: string }> }
) {
    try {
        const { cpf } = (await req.json()) as { cpf?: string }
        const { orderId } = await context.params
        if (!orderId || !cpf) return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400 })

        // validação mínima: 11 dígitos
        const onlyDigits = cpf.replace(/\D/g, '')
        if (onlyDigits.length !== 11) return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, totalCents: true, status: true },
        })
        if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
        if (order.status !== 'PENDING') return NextResponse.json({ error: 'Pedido não está pendente' }, { status: 400 })

        const txid = nanoid(26)
        // payload "mock" (NÃO é EMV válido) — suficiente para protótipo
        const payload = `PIXMOCK|order:${order.id}|amount:${(order.totalCents/100).toFixed(2)}|cpf:${onlyDigits}|txid:${txid}`

        await prisma.order.update({
            where: { id: orderId },
            data: { customerCpf: onlyDigits, pixTxId: txid, pixPayload: payload },
        })

        return NextResponse.json({
            id: order.id,
            amount: order.totalCents / 100,
            txid,
            payload,
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Erro ao gerar PIX' }, { status: 500 })
    }
}
