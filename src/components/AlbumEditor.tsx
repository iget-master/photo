// app/albums/[id]/edit/AlbumEditor.tsx
'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Upload, X } from 'lucide-react'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { Spinner } from '@/components/ui/spinner'
import { useAlbumUploader } from '@/hooks/useAlbumUploader'

const brlIntl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const FALLBACK =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iOTYiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgc3R5bGU9ImZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7Zm9udC1zaXplOjEwcHgiPnNlbSBjYXBhPC90ZXh0Pjwvc3ZnPg=='

function parseBRL(s: string) {
    if (!s) return 0
    const n = Number(s.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
}

function human(bytes?: number) {
    if (!bytes && bytes !== 0) return ''
    const u = ['B', 'KB', 'MB', 'GB']; let v = bytes; let i = 0
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
    return `${v.toFixed(1)} ${u[i]}`
}

// SafeImage com preload/decode para evitar flick ao trocar blob->url final
function SafeImage({ src, alt, sizes = '160px' }: { src: string; alt: string; sizes?: string }) {
    const [display, setDisplay] = React.useState(src || FALLBACK)

    React.useEffect(() => {
        let canceled = false
        if (!src) { setDisplay(FALLBACK); return }

        const img = new window.Image()
        img.src = src
        const done = () => { if (!canceled) setDisplay(src) }

        const canDecode = 'decode' in HTMLImageElement.prototype
        if (canDecode) {
            ;(img as HTMLImageElement).decode().then(done).catch(done)
        } else {
            const onLoad = () => done()
            const onError = () => done()
            img.addEventListener('load', onLoad, { once: true })
            img.addEventListener('error', onError, { once: true })
            return () => {
                canceled = true
                img.removeEventListener('load', onLoad)
                img.removeEventListener('error', onError)
            }
        }
        return () => { canceled = true }
    }, [src])

    return (
        <Image
            src={display || FALLBACK}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover transition-opacity duration-300"
        />
    )
}

type ExistingPhoto = {
    id: string
    url: string
    size?: number
    originalName?: string
}

type Initial = {
    id: string
    new: boolean
    albumName: string
    pricePerPhotoBRL: string
    coverPhotoUrl: string | null
    photos: ExistingPhoto[]
}

export default function AlbumEditor({ initial }: { initial: Initial }) {
    const router = useRouter()

    const {
        items: photos, inflight, progress,
        addFiles, removeItem, clearAll, setItems,
    } = useAlbumUploader(initial.id)

    const [isNew, setIsNew] = React.useState(initial.new);
    const [albumName, setAlbumName] = React.useState(initial.albumName)
    const [priceBRL, setPriceBRL] = React.useState(initial.pricePerPhotoBRL)
    const [coverPhotoUrl, setCoverPhotoUrl] = React.useState<string | null>(initial.coverPhotoUrl)
    const [saving, setSaving] = React.useState(false)

    const [isDragging, setIsDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    // carrega as fotos iniciais no estado do hook
    React.useEffect(() => {
        setItems(
            initial.photos.map((p) => ({
                clientKey: p.id,     // clientKey == id persistido
                tempUrl: p.url,
                finalUrl: p.url,
                photoId: p.id,
                name: p.originalName ?? p.id,
                size: p.size ?? 0,
            }))
        )
    }, [initial.photos, setItems])

    // drag & drop
    const onDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false)
        if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
    }, [addFiles])
    const onDragOver = React.useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
    const onDragLeave = React.useCallback(() => setIsDragging(false), [])

    // remover foto (chama API e tira do estado)
    const onRemovePersisted = React.useCallback(async (pid: string) => {
        // Não deixa remover enquanto envia
        const isTemp = !photos.find((p) => p.clientKey === pid)?.photoId
        if (isTemp || inflight > 0) return

        const res = await fetch(`/api/photos/${pid}`, { method: 'DELETE' })
        if (!res.ok) { alert('Falha ao excluir foto'); return }

        // remove do estado e ajusta capa se necessário
        setItems((prev) => {
            const removed = prev.find((p) => p.clientKey === pid)
            const filtered = prev.filter((p) => p.clientKey !== pid)
            const wasCover = removed?.finalUrl && coverPhotoUrl === removed.finalUrl
            const nextCover = wasCover ? (filtered[0]?.finalUrl ?? null) : coverPhotoUrl
            setCoverPhotoUrl(nextCover ?? null)
            return filtered
        })
    }, [photos, inflight, coverPhotoUrl, setItems])

    // escolher capa
    const setCoverById = React.useCallback((pid: string) => {
        const p = photos.find((x) => x.clientKey === pid)
        if (!p?.photoId || !p.finalUrl) return
        setCoverPhotoUrl(p.finalUrl)
    }, [photos])

    // salvar
    const onSave = React.useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (inflight > 0) return
        setSaving(true)
        let response;

        if (isNew) {
            response = await fetch(`/api/albums`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: initial.id,
                    albumName,
                    pricePerPhotoBRL: priceBRL || '0,00',
                }),
            })
            setSaving(false)

            if (response.ok) {
                setIsNew(false)
                router.replace(`/albums/${initial.id}/edit`)
            } else {
                alert('Não foi possível salvar na API.')
            }

        } else {
            response = await fetch(`/api/albums/${initial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    albumName,
                    pricePerPhotoBRL: priceBRL || '0,00',
                    coverPhotoUrl,
                }),
            })

            if (response.ok) {
                router.push('/albums?updated=1')
            } else {
                alert('Não foi possível salvar na API.')
            }

        }

    }, [albumName, priceBRL, coverPhotoUrl, inflight, initial.id, router])

    // helpers BRL
    const handlePriceChange = React.useCallback((raw: string) => {
        const digits = raw.replace(/\D/g, '')
        if (!digits) { setPriceBRL(''); return }
        const v = (parseInt(digits, 10) / 100).toFixed(2)
        setPriceBRL(v.replace('.', ','))
    }, [])
    const handlePriceBlur = React.useCallback((raw: string) => {
        if (!raw) return
        const n = parseBRL(raw)
        setPriceBRL(n.toFixed(2).replace('.', ','))
    }, [])

    const totalPhotos = photos.length
    const numericPrice = parseBRL(priceBRL)
    const estimatedTotal = totalPhotos * numericPrice
    const disabledAll = saving || inflight > 0

    return (
        <form onSubmit={onSave}>
            <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-4">
                        <Label htmlFor="albumName">Nome do Álbum</Label>
                        <Input id="albumName" value={albumName} onChange={(e) => setAlbumName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pricePerPhoto">Valor por Foto (R$)</Label>
                        <Input
                            id="pricePerPhoto"
                            inputMode="numeric"
                            placeholder="0,00"
                            value={priceBRL}
                            onChange={(e) => handlePriceChange(e.target.value)}
                            onBlur={(e) => handlePriceBlur(e.target.value)}
                        />
                        {totalPhotos > 0 && numericPrice > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Estimativa: {totalPhotos} foto(s) × {brlIntl.format(numericPrice)} ={' '}
                                <span className="font-medium">{brlIntl.format(estimatedTotal)}</span>
                            </p>
                        )}
                    </div>
                </div>

                {isNew ? (<h1 className="text-lg">* Finalize a criação do album para enviar fotos.</h1>) : (
                <>
                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={
                        'relative rounded-2xl border-2 border-dashed p-8 text-center transition ' +
                        (isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:bg-muted/30')
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
                    aria-disabled={disabledAll || isNew}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.currentTarget.value = '' }}
                        disabled={disabledAll || isNew}
                    />
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
                        <div className="rounded-full border p-3"><Upload className="h-6 w-6" aria-hidden /></div>
                        <p className="text-sm">
                            Arraste novas fotos aqui ou <span className="font-semibold underline">clique para selecionar</span>
                        </p>
                        <p className="text-xs text-muted-foreground">As fotos aparecerão com barra de progresso enquanto enviam.</p>
                    </div>
                </div>

                {/* Grid de fotos */}
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-sm font-medium text-muted-foreground">Fotos do álbum ({photos.length})</h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { clearAll(); setCoverPhotoUrl(null) }}
                            disabled={photos.length === 0 || inflight > 0}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Remover todas
                        </Button>
                    </div>

                    {photos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma foto. Adicione novas acima.</p>
                    ) : (
                        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {photos.map((p) => {
                                const pct = progress[p.clientKey]
                                const isTemp = !p.photoId
                                const url = p.finalUrl ?? p.tempUrl
                                const isCover = coverPhotoUrl === p.finalUrl
                                return (
                                    <li key={p.clientKey} className="group overflow-hidden rounded-xl border">
                                        <div className="relative h-40 w-full">
                                            <SafeImage src={url} alt={p.name} sizes="160px" />

                                            {(isTemp || (typeof pct === 'number' && pct < 100)) && (
                                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/35 backdrop-blur-[1px]">
                                                    <Spinner size={22} />
                                                    <span className="text-[11px] text-white/90">
                            Enviando{typeof pct === 'number' ? ` ${pct}%` : '…'}
                          </span>
                                                </div>
                                            )}

                                            {typeof pct === 'number' && (
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                                                    <div className="h-full bg-white/80" style={{ width: `${pct}%` }} />
                                                </div>
                                            )}

                                            <div className="absolute left-2 top-2 z-20">
                                                {isCover ? (
                                                    <span className="rounded bg-emerald-600/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                            CAPA ATUAL
                          </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCoverById(p.clientKey)}
                                                        disabled={isTemp || inflight > 0}
                                                        className="rounded bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur hover:bg-black/80 disabled:opacity-50"
                                                        aria-label="Usar como capa"
                                                    >
                                                        USAR COMO CAPA
                                                    </button>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                aria-label={`Remover ${p.name}`}
                                                onClick={() => isTemp ? removeItem(p.clientKey) : onRemovePersisted(p.clientKey)}
                                                className="absolute right-2 top-2 z-20 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                                                disabled={inflight > 0}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 border-t bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                      <span className="line-clamp-1 break-all" title={p.name}>
                        {p.name}
                      </span>
                                            <span className="shrink-0">{human(p.size)}</span>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
                </>
                )}
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
                <Button asChild variant="outline"><Link href={`/albums`}>Cancelar</Link></Button>
                <Button type="submit" disabled={disabledAll}>
                    {saving ? (isNew ? 'Criando…' : 'Salvando…') : inflight > 0 ? 'Aguarde envio…' : (isNew ? 'Criar' : 'Salvar alterações')}
                </Button>
            </CardFooter>

            <LoadingOverlay show={saving} label={isNew ? "Criando album…" : "Salvando alterações…"} />
        </form>
    )
}
