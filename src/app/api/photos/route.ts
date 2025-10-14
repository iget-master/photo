import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * POST /api/photos
 * Body: { url: string; sizeBytes?: number; originalName?: string }
 * Cria foto órfã (albumId null). Retorna { id, url, originalName, sizeBytes, createdAt }
 */
export async function POST(req: Request) {
    try {
        const { url, sizeBytes, originalName } = (await req.json()) as {
            url?: string
            sizeBytes?: number
            originalName?: string
        }
        if (!url) {
            return NextResponse.json({ error: 'url é obrigatória' }, { status: 400 })
        }

        const photo = await prisma.photo.create({
            data: { url, sizeBytes: sizeBytes ?? null, originalName: originalName ?? null, albumId: null },
            select: { id: true, url: true, originalName: true, sizeBytes: true, createdAt: true },
        })

        return NextResponse.json(photo, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Erro ao criar foto' }, { status: 500 })
    }
}