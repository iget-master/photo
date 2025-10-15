// app/albums/[id]/edit/page.tsx
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import AlbumEditor from '@/components/AlbumEditor'
import cuid from "cuid";

export const dynamic = 'force-dynamic'

function centsToBRL(cents: number | null | undefined) {
    const n = typeof cents === 'number' ? cents : 0
    return (n / 100).toFixed(2).replace('.', ',')
}

export default async function EditAlbumPage({
                                                params,
                                            }: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/auth/signin')

    let initialData;

    if ( id === 'new') {
        initialData = {
            id: cuid(),
            new: true,
            albumName: '',
            pricePerPhotoBRL: '0',
            coverPhotoUrl: null,
            photos: [],
        }
    } else {
        const album = await prisma.album.findFirst({
            where: { id, photographerId: session.user.id },
            include: {
                photos: {
                    orderBy: { id: 'desc' },
                    select: { id: true, url: true, sizeBytes: true, originalName: true },
                },
            },
        })

        if (!album) {
            notFound()
        }

        initialData = {
            id: album.id,
            new: false,
            albumName: album.albumName,
            pricePerPhotoBRL: centsToBRL(album.pricePerPhotoCents),
            coverPhotoUrl: album.coverPhotoUrl ?? null,
            photos: album.photos.map((p) => ({
                id: p.id,
                url: p.url,
                size: p.sizeBytes ?? undefined,
                originalName: p.originalName ?? undefined,
                clientKey: p.id,
                temp: false,
            })),
        }
    }




    return (
        <div className="mx-auto max-w-6xl p-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {initialData.new ? `Criar novo álbum` : `Editar álbum — ${initialData.albumName}`}
                </h1>
                <div className="flex gap-2">
                    <Button asChild variant="outline"><Link href="/albums">Voltar</Link></Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Dados do álbum</CardTitle>
                </CardHeader>

                <AlbumEditor initial={initialData} />
            </Card>
        </div>
    )
}
