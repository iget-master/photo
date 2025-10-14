'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react'

type SortBy = 'name' | 'photos' | 'visits' | 'sold' | 'conversion' | 'revenue'
type SortDir = 'asc' | 'desc'

export default function SortBar({ sortBy, sortDir }: { sortBy: SortBy; sortDir: SortDir }) {
    const router = useRouter()
    const pathname = usePathname()
    const sp = useSearchParams()

    const setParam = React.useCallback(
        (key: string, value: string) => {
            const p = new URLSearchParams(sp?.toString())
            p.set(key, value)
            router.push(`${pathname}?${p.toString()}`)
        },
        [router, pathname, sp],
    )

    return (
        <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setParam('sortBy', v)}>
                <SelectTrigger className="w-44">
                    <SelectValue placeholder="Ordenar por:" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="revenue">Faturamento</SelectItem>
                    <SelectItem value="conversion">Conversão</SelectItem>
                    <SelectItem value="sold">Vendidas</SelectItem>
                    <SelectItem value="visits">Visitas</SelectItem>
                    <SelectItem value="photos">Fotos</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                </SelectContent>
            </Select>
            <Button
                variant="outline"
                size="icon"
                aria-label="Alternar direção"
                onClick={() => setParam('sortDir', sortDir === 'asc' ? 'desc' : 'asc')}
            >
                {sortDir === 'asc' ? <ArrowUpWideNarrow className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
            </Button>
        </div>
    )
}
