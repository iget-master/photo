import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";

export const runtime = 'nodejs'

type Body = {
    photos: Array<{
        id: string;
        url: string
        sizeBytes?: number | null
        originalName?: string | null
    }>
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // <- params é Promise
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: albumId } = await context.params
        const body = await req.json();
        const { photos }: Body = body

        if (await prisma.album.count({
            where: { id: albumId, photographerId: session!.user.id }
        }) !== 1) {
            return NextResponse.json({reason: 'Album doesn\'t belongs to you' }, {status: 403})
        }

        console.log(body, photos);

        if (!Array.isArray(photos) || photos.length === 0) {
            return NextResponse.json({ photos: [] }, { status: 201 })
        }

        console.log('photos', photos);

         await prisma.$transaction(
            photos.map(({id, url, sizeBytes, originalName}) =>
                prisma.photo.create({
                    data: {
                        id,
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
            orderBy: {
                id: 'desc'
            }
        })

        return NextResponse.json(rows, { status: 201 })
    } catch (e) {
        console.error('Failed to retrieve album photos', {e})
        return NextResponse.json({ error: 'Failed to retrieve album photos' }, { status: 500 })
    }
}
