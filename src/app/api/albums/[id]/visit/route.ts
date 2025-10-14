import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
const WINDOW_MINUTES = 30

export async function POST(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const store = await cookies()
    const cookieName = `album_visit_${id}`
    const existing = store.get(cookieName)

    let shouldCount = true
    if (existing?.value) {
        const last = Number(existing.value)
        if (!Number.isNaN(last)) {
            const diffMin = (Date.now() - last) / 60000
            if (diffMin < WINDOW_MINUTES) shouldCount = false
        }
    }

    if (shouldCount) {
        await prisma.album.update({
            where: { id },
            data: { visitCount: { increment: 1 } },
        })
        const expires = new Date(Date.now() + WINDOW_MINUTES * 60 * 1000)
        store.set(cookieName, String(Date.now()), {
            httpOnly: true,
            sameSite: 'lax',
            expires,
        })
    }

    return NextResponse.json({ ok: true, counted: shouldCount })
}
