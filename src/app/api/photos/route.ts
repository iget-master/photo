import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";

export const runtime = 'nodejs'

/**
 * POST /api/photos
 * Body: { url: string; sizeBytes?: number; originalName?: string }
 * Cria foto órfã (albumId null). Retorna { id, url, originalName, sizeBytes, createdAt }
 */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
            data: { url, sizeBytes: sizeBytes ?? null, originalName: originalName ?? null, albumId: null, ownerUserId: session.user.id },
            select: { id: true, url: true, originalName: true, sizeBytes: true, createdAt: true },
        })

        return NextResponse.json(photo, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Erro ao criar foto' }, { status: 500 })
    }
}