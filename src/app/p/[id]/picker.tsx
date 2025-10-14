'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

type PhotoLite = { id: string; url: string; originalName?: string | null; sizeBytes?: number | null }

export default function AlbumPicker({
                                        albumId,
                                        pricePerPhotoCents,
                                        photos,
                                    }: {
    albumId: string
    pricePerPhotoCents: number
    photos: PhotoLite[]
}) {
    const [selected, setSelected] = React.useState<Set<string>>(new Set())
    const [creating, setCreating] = React.useState(false)
    const router = useRouter()

    const toggle = (id: string) => {
        setSelected((s) => {
            const next = new Set(s)

            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const count = selected.size
    const total = (count * pricePerPhotoCents) / 100

    const handleBuy = async () => {
        if (count === 0 || creating) return
        setCreating(true)
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ albumId, photoIds: Array.from(selected) }),
            })
            if (!res.ok) throw new Error('Falha ao criar pedido')
            const data = await res.json()
            router.push(`/checkout/${data.id}`)
        } catch {
            alert('Não foi possível iniciar a compra.')
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="relative">
            {/* barra fixa topo-direita */}
            <div className="sticky top-2 z-10 ml-auto mb-3 w-fit rounded-xl border bg-background/90 px-3 py-2 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="text-sm">
                        <div className="font-medium">{count} selecionada(s)</div>
                        <div className="text-xs text-muted-foreground">
                            {pricePerPhotoCents > 0
                                ? <>Total {brl.format(total)} ({brl.format(pricePerPhotoCents / 100)} cada)</>
                                : <>Preço indisponível</>}
                        </div>
                    </div>
                    <Button size="sm" onClick={handleBuy} disabled={count === 0 || creating || pricePerPhotoCents <= 0}>
                        {creating ? 'Criando…' : 'Comprar'}
                    </Button>
                </div>
            </div>

            {photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma foto disponível neste álbum.</p>
            ) : (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {photos.map((p) => {
                        const isSel = selected.has(p.id)
                        return (
                            <li key={p.id} className={`relative overflow-hidden rounded-xl border ${isSel ? 'ring-2 ring-primary' : ''}`}>
                                <div
                                    className="relative h-40 w-full cursor-pointer"
                                    onClick={() => toggle(p.id)}
                                    role="button"
                                    aria-pressed={isSel}
                                >
                                    <Image src={p.url} alt={p.originalName ?? p.id} fill sizes="160px" className="object-cover" />
                                    <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                                        {isSel ? 'Selecionada' : 'Selecionar'}
                                    </div>
                                </div>
                                <div className="border-t bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                  <span className="line-clamp-1 break-all" title={p.originalName ?? p.id}>
                    {p.originalName ?? p.id}
                  </span>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
