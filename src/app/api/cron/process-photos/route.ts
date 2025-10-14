import prisma from "@/lib/prisma";
import {makeThumb, makeWatermark} from "@/lib/imaging";
import {uploadBufferToBlob} from "@/lib/blob";
import {NextResponse} from "next/server";

export const runtime = 'nodejs'

const PHOTO_PROCESSING_MAX_ATTEMPTS = 3;

async function markPhotoProcessingAsFailed(photo: {id: string, attempts: number}) {
    const status = ((photo.attempts + 1) >= PHOTO_PROCESSING_MAX_ATTEMPTS) ? 'FAILED' : 'NEW';

    await prisma.photo.update({
        where: { id: photo.id, processingAt: null },
        data: {
            status,
            attempts: photo.attempts + 1,
            processingAt: null
        }
    })
}

export async function GET() {
    const counters = {successfull: 0, failed: 0}
    const unprocessedPhotos = await prisma.$transaction(async (tx) => {
        const items = await tx.photo.findMany({
            where: { albumId: { not: null }, status: 'NEW' },
            orderBy: { createdAt: 'asc' },
            take: 10,
            select: { id: true, albumId: true, url: true, attempts: true },
        });

        if (items.length === 0) return [];

        await tx.photo.updateMany({
            where: { id: { in: items.map((p) => p.id) } },
            data: {
                processingAt: new Date(),
            },
        });

        return items;
    });

    for (const photo of unprocessedPhotos) {
        const response = await fetch(photo.url);

        if (!response.ok) {
            console.error("Failed to fetch original photo blob for processing.", { id: photo.id, response });
            await markPhotoProcessingAsFailed(photo)
            counters.failed++;
            continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        const prefix = photo.albumId ? `albums/${photo.albumId}/` : undefined

        try {
            const [watermarkBuf, thumbnailBuf] = await Promise.all([makeWatermark(buffer), makeThumb(buffer)])
            const [watermarkUrl, thumbnailUrl] = await Promise.all([
                uploadBufferToBlob(watermarkBuf, prefix),
                uploadBufferToBlob(thumbnailBuf, prefix),
            ])

            await prisma.photo.update({
                where: { id: photo.id },
                data: { urlWatermark: watermarkUrl, urlThumb: thumbnailUrl, status: 'DONE', processingAt: null },
            })
            console.log('Photo processed successfully', {id: photo.id});
        } catch (e) {
            console.error('Failed to create or upload watermark or thumbnail.', {id: photo.id, e})
            await markPhotoProcessingAsFailed(photo);
            counters.failed++;
        }

        counters.successfull++;
    }

    return NextResponse.json(counters)
}
