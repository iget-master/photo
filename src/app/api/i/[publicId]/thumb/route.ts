// app/api/i/[publicId]/thumb/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(_req: Request, context: { params: Promise<{ publicId: string }> }) {
    const { publicId } = await context.params
    const photo = await prisma.photo.findUnique({
        where: { publicId },
        select: { urlThumb: true },
    })
    if (!photo?.urlThumb) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.redirect(photo.urlThumb, 302)
}
