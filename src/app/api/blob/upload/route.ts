// app/api/blob/upload/route.ts
import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export const runtime = 'nodejs' // sem Prisma aqui, mas mantemos Node

export async function POST(request: Request) {
    const body = (await request.json()) as HandleUploadBody
    try {
        const json = await handleUpload({
            request,
            body,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // TODO: validar auth/albumId em clientPayload no futuro
                return {
                    addRandomSuffix: true,
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
                    tokenPayload: clientPayload ?? '', // volta no onUploadCompleted, se usar
                }
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // Opcional (não usamos neste fluxo, persistimos após o upload no client)
                console.log('upload completo:', blob.url, tokenPayload)
            },
        })
        return NextResponse.json(json)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 })
    }
}
