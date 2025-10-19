import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import prisma from "@/lib/prisma";
import {notFound} from "next/navigation";

export const runtime = 'nodejs' // sem Prisma aqui, mas mantemos Node

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Valida: albums/{albumId}/raw/{nanoid}/{filename}.{jpg|png}
 * - nanoid: 21 chars em [A-Za-z0-9_-]
 * - filename: letras/números/ponto/underscore/hífen (sem '/'), não começa com ponto
 * - extensão: jpg ou png
 */
export function buildPathRegex(albumId: string) {
    const aid = escapeRegExp(albumId)
    return new RegExp(
        `^albums/${aid}/raw/[A-Za-z0-9_-]{21}/[A-Za-z0-9][A-Za-z0-9 ._-]*\\.(?:jpeg|jpg|png|webp)$`,
        'i'
    )
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return notFound();

    const { id: albumId } = await params;

    const albumBelongsToUser = await prisma.album.count({where: { id: albumId, photographerId: session!.user.id }}) === 1

    if (!albumBelongsToUser) {
        return NextResponse.json({reason: 'Album doesn\'t belongs to you' }, {status: 403})
    }

    const body = (await request.json()) as HandleUploadBody
    try {
        const json = await handleUpload({
            request,
            body,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                const meta = clientPayload ? JSON.parse(clientPayload as string) : {}

                if (await prisma.photo.count({where: {id: meta.id}}) > 0) {
                    throw 'Photo ID collision happened.';
                }

                if (!buildPathRegex(albumId).test(pathname)) {
                    console.log('invalid pathname', pathname, buildPathRegex(albumId))
                    throw 'Invalid pathname for current album';
                }

                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
                    tokenPayload: clientPayload ?? '',
                }
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('upload completo:', blob.url, tokenPayload)
            },
        })
        return NextResponse.json(json)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 })
    }
}
