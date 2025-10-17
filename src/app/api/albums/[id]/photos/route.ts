// app/api/albums/[id]/photos/route.ts
import { NextRequest, NextResponse, after } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

type Body = {
    photos: Array<{
        id: string
        url: string
        sizeBytes?: number | null
        originalName?: string | null
    }>
}

function getBaseUrl() {
    // escolha na ordem: NEXT_PUBLIC_SITE_URL -> NEXTAUTH_URL -> VERCEL_URL -> localhost
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    )
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // params é Promise (como você usa)
) {
    try {
        const session = await getServerSession(authOptions)
        const { id: albumId } = await context.params

        const albumBelongsToUser = await prisma.album.count({where: { id: albumId, photographerId: session!.user.id }}) === 1

        if (!session?.user || !albumBelongsToUser) {
            return NextResponse.json({reason: 'Album doesn\'t belongs to you' }, {status: 403})
        }

        const body = (await req.json()) as Body
        const { photos } = body ?? {}

        if (!Array.isArray(photos) || photos.length === 0) {
            return NextResponse.json({ photos: [] }, { status: 201 })
        }

        await prisma.$transaction(
            photos.map(({ id, url, sizeBytes, originalName }) =>
                prisma.photo.create({
                    data: {
                        id,
                        ownerUserId: session.user.id,
                        albumId,
                        url,
                        sizeBytes: sizeBytes ?? null,
                        originalName: originalName ?? null,
                    },
                }),
            ),
        )

        const rows = await prisma.photo.findMany({
            where: { albumId },
            select: {
                id: true,
                url: true,
                sizeBytes: true,
                originalName: true,
                createdAt: true,
            },
            orderBy: { id: 'desc' },
        })

        const onlyIds = photos.map((p) => p.id)
        const baseUrl = getBaseUrl()
        const authHeader = {
                    Authorization: `Bearer ${process.env.CRON_SECRET}`,
                }

        after(async () => {
            try {
                await fetch(`${baseUrl}/api/cron/process-photos`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json', ...(authHeader ?? {}) },
                    body: JSON.stringify({ only: onlyIds }),
                })
            } catch (err) {
                console.error('Failed to trigger cron/process-photos', err)
            }
        })

        return NextResponse.json(rows, { status: 201 })
    } catch (e) {
        console.error('Failed to retrieve album photos', { e })
        return NextResponse.json(
            { error: 'Failed to retrieve album photos' },
            { status: 500 },
        )
    }
}
