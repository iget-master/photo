// app/p/[id]/AlbumClient.tsx
'use client'

import * as React from 'react'
import Image from 'next/image'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import PixQRCode from '@/components/PixQRCode'
import {Star} from "lucide-react";

type Photo = {
    id: string;
    urlThumb: string | null;
    urlWatermark: string | null;
    originalName: string | null
}

type Props = {
    albumId: string
    albumName: string
    unitPriceBRL: number
    photos: Photo[]
    pixPayload: string | null
}

const LS_KEY = (albumId: string) => `album:${albumId}:selected`

export default function AlbumClient({ albumId, albumName, unitPriceBRL, photos, pixPayload: pixPayloadInitial }: Props) {
    const [tab, setTab] = React.useState<'all' | 'selected'>('all')
    const [selected, setSelected] = React.useState<Set<string>>(new Set())
    const [modalPhoto, setModalPhoto] = React.useState<Photo | null>(null)

    // compra
    const [buyOpen, setBuyOpen] = React.useState(false)
    const [email, setEmail] = React.useState('')
    const [cpf, setCpf] = React.useState('')
    const [creating, setCreating] = React.useState(false)
    const [orderId, setOrderId] = React.useState<string | null>(null)
    const [pixPayload, setPixPayload] = React.useState<string | null>(pixPayloadInitial ?? null)
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

    React.useEffect(() => {
        try {
            const raw = localStorage.getItem(LS_KEY(albumId))
            if (raw) setSelected(new Set(JSON.parse(raw)))
        } catch {}
        fetch(`/api/p/${albumId}/visit`, { method: 'POST' }).catch(() => {})
    }, [albumId])

    React.useEffect(() => {
        try {
            localStorage.setItem(LS_KEY(albumId), JSON.stringify(Array.from(selected)))
        } catch {}
    }, [albumId, selected])

    const isSelected = React.useCallback((id: string) => selected.has(id), [selected])
    const toggleSelect = React.useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }, [])

    const selectedArray = React.useMemo(() => photos.filter(p => selected.has(p.id)), [photos, selected])
    const totalBRL = React.useMemo(() => selected.size * unitPriceBRL, [selected.size, unitPriceBRL])

    const formatCpfMask = (v: string) =>
        v.replace(/\D/g, '').slice(0, 11)
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')

    async function handleCreateOrderAndPix() {
        setErrorMsg(null)
        if (selected.size === 0) return

        const cleanCpf = cpf.replace(/\D/g, '')
        const emailTrim = email.trim().toLowerCase()

        if (!emailTrim || !/^\S+@\S+\.\S+$/.test(emailTrim)) {
            setErrorMsg('Informe um e-mail válido.')
            return
        }
        if (cleanCpf.length !== 11) {
            setErrorMsg('Informe um CPF válido (11 dígitos).')
            return
        }

        try {
            setCreating(true)

            // 1) cria o pedido (AGORA com email + cpf)
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    albumId,
                    photoIds: Array.from(selected),
                    customerEmail: emailTrim,
                    customerCpf: cleanCpf,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || 'Falha ao criar o pedido')

            const createdOrderId: string = data.orderId || data.id
            if (!createdOrderId) throw new Error('Pedido criado sem ID na resposta.')
            setOrderId(createdOrderId)

            // 2) gera o payload PIX (continua mandando cpf)
            const resPix = await fetch(`/api/orders/${createdOrderId}/pix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf: cleanCpf }),
            })
            const pix = await resPix.json()
            if (!resPix.ok) throw new Error(pix?.error || 'Falha ao gerar PIX')

            setPixPayload(pix.payload as string)
        } catch (e: any) {
            setErrorMsg(e?.message || 'Erro ao iniciar o pagamento.')
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="mx-auto max-w-6xl p-6">
            <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{albumName}</h1>
                    <p className="text-sm text-muted-foreground">
                        Preço por foto:{' '}
                        <b>{unitPriceBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-sm">
                        Selecionadas: <b>{selected.size}</b> — Total:{' '}
                        <b>{totalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
                    </div>
                    <Button onClick={() => setBuyOpen(true)} disabled={selected.size === 0}>
                        Comprar selecionadas
                    </Button>
                </div>
            </header>

            {/* TABS */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'selected')}>
                <TabsList className="mb-4">
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="selected">Selecionadas ({selected.size})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                    <PhotoGrid photos={photos} isSelected={isSelected} onToggle={toggleSelect} onOpenModal={setModalPhoto} />
                </TabsContent>

                <TabsContent value="selected" className="mt-0">
                    {selectedArray.length === 0 ? (
                        <div className="rounded-lg border p-6 text-sm text-muted-foreground">Nenhuma foto selecionada ainda.</div>
                    ) : (
                        <PhotoGrid photos={selectedArray} isSelected={isSelected} onToggle={toggleSelect} onOpenModal={setModalPhoto} />
                    )}
                </TabsContent>
            </Tabs>

            {/* MODAL VISUALIZAÇÃO */}
            <Dialog open={!!modalPhoto} onOpenChange={(o) => !o && setModalPhoto(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{modalPhoto?.originalName ?? 'Visualização'}</DialogTitle>
                    </DialogHeader>

                    {modalPhoto && (
                        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-black">
                            <Image
                                src={modalPhoto.urlWatermark!}
                                alt={modalPhoto.originalName ?? ''}
                                fill
                                sizes="(max-width: 768px) 100vw, 1024px"
                                className="object-contain"
                            />
                        </div>
                    )}

                    <DialogFooter className="flex items-center justify-between">
                        <div />
                        {modalPhoto && (
                            <Button
                                onClick={() => toggleSelect(modalPhoto.id)}
                                variant={isSelected(modalPhoto.id) ? 'default' : 'secondary'}
                            >
                                {isSelected(modalPhoto.id) ? 'Remover da seleção' : 'Selecionar'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL COMPRA / PIX */}
            <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Finalizar compra</DialogTitle>
                    </DialogHeader>

                    {!orderId && (
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                Você está comprando <b>{selected.size}</b> foto(s). Total:{' '}
                                <b>{totalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">E-mail para receber as fotos</label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={creating || !!orderId}
                                    autoComplete="email"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="cpf" className="text-sm font-medium">CPF do pagador</label>
                                <Input
                                    id="cpf"
                                    inputMode="numeric"
                                    placeholder="000.000.000-00"
                                    value={formatCpfMask(cpf)}
                                    onChange={(e) => setCpf(e.target.value)}
                                    disabled={creating || !!orderId}
                                    autoComplete="off"
                                />
                            </div>

                            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

                            <DialogFooter>
                                <Button variant="secondary" onClick={() => setBuyOpen(false)} disabled={creating}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleCreateOrderAndPix} disabled={creating || selected.size === 0}>
                                    {creating ? 'Gerando PIX…' : 'Gerar PIX'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {orderId && pixPayload && (
                        <div className="space-y-3">
                            <div className="text-sm">
                                Pedido <b>{orderId}</b> — pague via PIX para concluir.
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <PixQRCode payload={pixPayload} size={240} />
                                <details className="w-full text-xs text-muted-foreground">
                                    <summary className="cursor-pointer">Ver payload</summary>
                                    <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2">{pixPayload}</pre>
                                </details>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => setBuyOpen(false)}>Fechar</Button>
                            </DialogFooter>
                        </div>
                    )}

                    {orderId && !pixPayload && (
                        <Card className="p-4 text-sm">
                            Gerando QR Code do PIX...
                        </Card>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

function PhotoGrid({
                       photos,
                       isSelected,
                       onToggle,
                       onOpenModal,
                   }: {
    photos: Photo[]
    isSelected: (id: string) => boolean
    onToggle: (id: string) => void
    onOpenModal: (photo: Photo) => void
}) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => {
                if (!photo.urlThumb || !photo.urlWatermark) {
                    return;
                }

                const sel = isSelected(photo.id)
                return (
                    <div key={photo.id} className="group relative overflow-hidden rounded-lg border">
                        <button
                            type="button"
                            onClick={() => onOpenModal(photo)}
                            className="relative block aspect-[3/2] w-full"
                            aria-label={`Abrir ${photo.originalName ?? 'foto'}`}
                        >
                            <Image
                                src={photo.urlThumb}
                                alt={photo.originalName ?? 'foto'}
                                fill
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                        </button>

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                        <button
                            type="button"
                            onClick={() => onToggle(photo.id)}
                            className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full border border-white/30 bg-black/50 p-2 backdrop-blur transition hover:bg-black/70"
                            aria-label={sel ? 'Remover da seleção' : 'Selecionar'}
                        >
                            <Star color={sel ? '#FDC700FF' : 'white'} strokeWidth={sel ? 2 : 1} fill={sel ? '#FDC700FF' : 'transparent'}/>
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
