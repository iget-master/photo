import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { del } from '@vercel/blob'

export const runtime = 'nodejs'

export async function GET() {
    const days = parseInt(process.env.PRUNE_ORPHAN_DAYS || '7', 10)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const orphans = await prisma.photo.findMany({
        where: { albumId: null, createdAt: { lt: cutoff } },
        select: { id: true, url: true },
    })

    let deleted = 0
    for (const p of orphans) {
        try {
            await del(p.url)
        } catch (e) {
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
