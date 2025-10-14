import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import { compare } from 'bcryptjs'

/**
 * Resolve a URL base do app sem precisar definir NEXTAUTH_URL manualmente.
 * - Em produção (Vercel), usa https://${VERCEL_URL}
 * - Em dev, usa http://localhost:3000
 * - Se NEXTAUTH_URL existir, tem prioridade
 */
const baseUrl =
    process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export const authOptions: NextAuthOptions = {
    session: { strategy: 'jwt' },

    providers: [
        Credentials({
            name: 'E-mail e senha',
            credentials: {
                email: { label: 'E-mail', type: 'email' },
                password: { label: 'Senha', type: 'password' },
            },
            async authorize(credentials) {
                const email = credentials?.email?.toString().trim().toLowerCase()
                const password = credentials?.password?.toString() ?? ''
                if (!email || !password) return null

                const user = await prisma.user.findUnique({ where: { email } })
                if (!user || !user.hashedPassword) return null

                const ok = await compare(password, user.hashedPassword)
                if (!ok) return null

                // O que retornar aqui entra no JWT (token)
                return {
                    id: user.id,
                    name: user.name ?? undefined,
                    email: user.email ?? undefined,
                    image: user.image ?? undefined,
                }
            },
        }),
    ],

    pages: {
        signIn: '/login', // nossa página de login
    },

    callbacks: {
        async session({ session, token }) {
            // expõe o id no session.user.id
            if (session.user && token.sub) {
                ;(session.user as any).id = token.sub
            }
            return session
        },

        /**
         * Redirecionamentos seguros sem depender de NEXTAUTH_URL.
         * - aceita caminhos relativos ("/algo") -> junta com baseUrl
         * - aceita URLs absolutas somente se forem do mesmo host
         * - fallback para baseUrl
         */
        async redirect({ url, baseUrl: _ignored }) {
            try {
                // Caminho relativo
                if (url.startsWith('/')) return baseUrl + url

                const dest = new URL(url)
                const base = new URL(baseUrl)

                // Mesmo host/origin -> permite
                if (dest.origin === base.origin) return url
            } catch {
                // url inválida -> ignora
            }
            // fallback seguro
            return baseUrl
        },
    },

    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
}
