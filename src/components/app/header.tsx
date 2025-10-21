import Link from 'next/link'
import { Camera } from 'lucide-react'
import { getServerSession } from 'next-auth'
import UserMenu from './UserMenu'
import { Button } from '@/components/ui/button'

import { authOptions } from '@/lib/auth'

export default async function Header() {
    const session = await getServerSession(authOptions)
    const user = session?.user

    return (
        <header className="sticky top-0 z-40 w-full border-b border-black/5 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Barra principal */}
                <div className="flex h-14 items-center justify-between gap-3">
                    {/* Logo */}
                    <Link href="/albums" className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <Camera className="size-5" aria-hidden />
                        </div>
                        <span className="text-base font-bold">Photo</span>
                    </Link>

                    {/* Ações (direita) */}
                    <div className="flex items-center gap-2">
                        {!user ? (
                            <>
                                <Button asChild variant="ghost">
                                    <Link href="/register">Registrar</Link>
                                </Button>
                                {/* Para login, você pode linkar para sua página /login
                   ou usar a rota do NextAuth: /api/auth/signin */}
                                <Button asChild>
                                    <Link href="/login">Entrar</Link>
                                </Button>
                            </>
                        ) : (
                            // Menu do usuário é um client component (dropdown interativo)
                            <UserMenu
                                name={user.name ?? 'Usuário'}
                                email={user.email ?? ''}
                                image={user.image ?? undefined}
                            />
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
