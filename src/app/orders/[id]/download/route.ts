import prisma from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'
import Archiver from 'archiver'
import { PassThrough } from 'stream'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> } // <- seu projeto tipa assim

export async function GET(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params // <- pega o orderId do segmento [id]

    const order = await prisma.order.findUnique({
        where: { id },
        select: {
            id: true,
            items: {
                orderBy: { createdAt: 'asc' },
                select: { photo: { select: { id: true, url: true } } },
            },
        },
    })

    if (!order) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const files = order.items
        .map((it, idx) => {
            const p = it.photo
            if (!p?.id || !p?.url) return null
            const ext = (() => {
                try {
                    const path = new URL(p.url).pathname
                    const maybe = path.split('.').pop() || ''
                    return maybe.length <= 5 ? maybe : 'jpg'
                } catch {
                    return 'jpg'
                }
            })()
            const name = `${String(idx + 1).padStart(3, '0')}-${p.id}.${ext}`
            return { url: p.url, name }
        })
        .filter(Boolean) as { url: string; name: string }[]

    if (files.length === 0) {
        return NextResponse.json({ error: 'No files' }, { status: 400 })
    }

    // Stream do ZIP
    const stream = new PassThrough()
    const archive = Archiver('zip', { zlib: { level: 9 } })
    archive.on('error', (err) => stream.emit('error', err))
    archive.pipe(stream)

    await Promise.all(
        files.map(async (f) => {
            try {
                const res = await fetch(f.url)
                if (!res.ok) {
                    console.error('[ZIP_FETCH_ERROR]', f.url, res.status)
                    return
                }
                const buf = Buffer.from(await res.arrayBuffer())
                archive.append(buf, { name: f.name })
            } catch (e) {
                console.error('[ZIP_FETCH_EXCEPTION]', f.url, e)
            }
        })
    )

    archive.finalize().catch((e) => console.error('[ZIP_FINALIZE_ERROR]', e))

    const filename = `pedido-${order.id}.zip`
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    // Adapta Node stream → Web ReadableStream
    const readable = new ReadableStream({
        start(controller) {
            stream.on('data', (chunk) => controller.enqueue(chunk))
            stream.on('end', () => controller.close())
            stream.on('error', (err) => controller.error(err))
        },
        cancel() {
            stream.destroy()
        },
    })

    return new NextResponse(readable as any, { headers })
}
