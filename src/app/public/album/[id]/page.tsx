import prisma from '@/lib/prisma'
import AlbumClient from './AlbumClient'
import {CameraOff} from "lucide-react";

type SP = Record<string, string | string[] | undefined>

export default async function Page({
                                       params,
                                       searchParams,
                                   }: {
    params: Promise<{ id: string }>
    searchParams: Promise<SP> | SP
}) {
    const sp = await searchParams
    const { id } = await params

    const album = await prisma.album.findUnique({
        where: { id },
        select: {
            id: true,
            albumName: true,
            pricePerPhotoCents: true,
            coverPhotoUrl: true,
            photos: {
                select: { id: true, urlThumb: true, urlWatermark: true, originalName: true },
                where: { deletedAt: null },
                orderBy: { createdAt: 'asc' },
            },
        },
    })

    if (!album) {
        return (
            <div className="mx-auto max-w-4xl p-6">
                <h1 className="text-xl font-semibold">Álbum não encontrado</h1>
            </div>
        )
    }

    // ⬇️ Fallback quando o álbum ainda não tem fotos
    if (album.photos.length === 0) {
        return (
            <div className="mx-auto max-w-4xl p-6 flex flex-col justify-center items-center space-y-3">
                <h1 className="text-xl font-semibold">{album.albumName ?? 'Álbum'}</h1>
                <CameraOff />
                <p className="text-muted-foreground">
                    Volte depois. Seu fotógrafo ainda não enviou as fotos para o álbum.
                </p>
            </div>
        )
    }

    const unitPriceBRL = (album.pricePerPhotoCents ?? 0) / 100
    const pixPayload = typeof sp?.pix === 'string' ? sp.pix : null

    return (
        <AlbumClient
            albumId={album.id}
            albumName={album.albumName}
            unitPriceBRL={unitPriceBRL}
            photos={album.photos}
            pixPayload={pixPayload}
        />
    )
}
