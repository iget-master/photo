import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import AlbumEditor from '@/components/AlbumEditor'
import cuid from "cuid";
import {ParamsWithId} from "@/types/params/id";
import {ChevronRight} from "lucide-react";
import Header from "@/components/app/header";
import * as React from "react";

export const dynamic = 'force-dynamic'

export default async function EditAlbumPage({ params }: ParamsWithId) {
    const { id } = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/auth/signin')

    let initialData;

    if ( id === 'new') {
        initialData = {
            id: cuid(),
            albumName: '',
            photos: [],
            meta: {
                new: true
            }
        }
    } else {
        const album = await prisma.album.findFirst({
            where: { id, photographerId: session.user.id },
            include: {
                photos: {
                    where: { deletedAt: null },
                    orderBy: { id: 'desc' },
                    select: { id: true, url: true, sizeBytes: true, originalName: true, urlThumb: true, urlWatermark: true },
                },
            },
        })

        if (!album) {
            notFound()
        }

        initialData = {
            id: album.id,
            albumName: album.albumName,
            pricePerPhotoCents: album.pricePerPhotoCents,
            coverPhotoUrl: album.coverPhotoUrl ?? null,
            photos: album.photos.map((photo) => ({
                ...photo,
                meta: { new: false }
            })),
            meta: {
                new: false
            }
        }
    }

    return (
        <>
        <Header/>
        <div className="mx-auto max-w-6xl p-6 space-y-6">
            <div className="flex items-center justify-start gap-3">
                <h1 className="flex items-center truncate text-xl font-semibold tracking-tight">
                    <Link href="/albums">
                        Albuns
                    </Link>
                    <ChevronRight className="h-4 w-4 mx-1 opacity-50"/>
                    {initialData.meta.new ? `Novo` : initialData.albumName}
                </h1>
            </div>

            <AlbumEditor initial={initialData} />
        </div>
        </>
    )
}
