import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { del } from '@vercel/blob'

export const runtime = 'nodejs'

/**
 * GET /api/cron/prune-photos
 * Remove fotos sem albumId criadas há mais de PRUNE_ORPHAN_DAYS dias (default 7)
 * Apaga do Blob e do banco.
 */
export async function GET(req: Request) {
    const days = parseInt(process.env.PRUNE_ORPHAN_DAYS || '7', 10)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const orphans = await prisma.photo.findMany({
        where: { albumId: null, createdAt: { lt: cutoff } },
        select: { id: true, url: true },
    })

    let deleted = 0
    for (const p of orphans) {
        try {
            // apaga do Blob (requer BLOB_READ_WRITE_TOKEN em produção/preview/local)
            await del(p.url)
        } catch (e) {
            // Se falhar apagar do blob, ainda assim tenta remover do banco?
            // Aqui preferimos deixar o registro se o blob não apagou, para tentar novamente
            // eslint-disable-next-line no-console
            console.warn('blob delete failed', p.url, e)
            continue
        }

        try {
            await prisma.photo.delete({ where: { id: p.id } })
            deleted++
        } catch (e) {
            console.error('db delete failed', p.id, e)
        }
    }

    return NextResponse.json({ pruned: deleted, scanned: orphans.length, days })
}
