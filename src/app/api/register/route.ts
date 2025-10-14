import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const { name, email, password, confirmPassword } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 })
        }

        if (typeof password !== 'string' || password.length < 8) {
            return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: 'As senhas não conferem.' }, { status: 400 })
        }

        const normalizedEmail = String(email).toLowerCase().trim()

        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
        if (existing) {
            return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })
        }

        const hashedPassword = await hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name: name ?? null,
                email: normalizedEmail,
                hashedPassword,
            },
            select: { id: true, email: true, name: true },
        })

        return NextResponse.json({ ok: true, user }, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Erro ao registrar usuário.' }, { status: 500 })
    }
}