'use client'

import * as React from 'react'
import Link from 'next/link'
import { Camera, LogOut, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

function Avatar({
                    src,
                    alt,
                    className = 'size-8 rounded-full bg-emerald-600/10 grid place-content-center text-xs font-semibold',
                }: { src?: string; alt?: string; className?: string }) {
    if (src) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={alt ?? ''} className={`size-8 rounded-full object-cover ${className}`} />
    }
    return (
        <div className={className}>
            <User className="size-4 opacity-70" aria-hidden />
        </div>
    )
}

export default function UserMenu({ name, email, image }: { name: string; email: string; image?: string }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                    <Avatar src={image} alt={name} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
                <div className="px-2 py-1.5 text-xs">
                    <div className="font-semibold">{name}</div>
                    <div className="truncate text-muted-foreground">{email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/account">
                        <Settings className="mr-2 size-4" />
                        Configurações
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/albums">
                        <Camera className="mr-2 size-4" />
                        Meus álbuns
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Logout sem hooks: form POST para a rota NextAuth */}
                <form action="/api/auth/signout" method="post">
                    <input type="hidden" name="callbackUrl" value="/" />
                    <DropdownMenuItem asChild className="text-red-600 focus:text-red-600">
                        <button type="submit" className="w-full text-left">
                            <div className="flex items-center">
                                <LogOut className="mr-2 size-4" />
                                Sair
                            </div>
                        </button>
                    </DropdownMenuItem>
                </form>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
