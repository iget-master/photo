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
import { upload } from '@vercel/blob/client'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { Spinner } from '@/components/ui/spinner'

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
export function SafeImage(
    { src, alt, sizes = '160px' }:
    { src: string; alt: string; sizes?: string }
) {
    const [display, setDisplay] = React.useState(src || FALLBACK)

    React.useEffect(() => {
        let canceled = false
        if (!src) { setDisplay(FALLBACK); return }

        const img = new window.Image()
        img.src = src

        const done = () => { if (!canceled) setDisplay(src) }

        const canDecode = 'decode' in HTMLImageElement.prototype

        if (canDecode) {
            ;(img as HTMLImageElement).decode()
                .then(done)
                .catch(done)
        } else {
            const onLoad = () => done()
            const onError = () => done()
            img.addEventListener('load', onLoad, { once: true })
            img.addEventListener('error', onError, { once: true })
            // cleanup
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
    temp?: boolean
    clientKey: string
}

type Initial = {
    id: string
    albumName: string
    pricePerPhotoBRL: string
    coverPhotoUrl: string | null
    photos: ExistingPhoto[]
}

export default function AlbumEditor({ initial }: { initial: Initial }) {
    const router = useRouter()

    const [albumName, setAlbumName] = React.useState(initial.albumName)
    const [priceBRL, setPriceBRL] = React.useState(initial.pricePerPhotoBRL)
    const [coverPhotoUrl, setCoverPhotoUrl] = React.useState<string | null>(initial.coverPhotoUrl)
    const [photos, setPhotos] = React.useState<ExistingPhoto[]>(initial.photos) // já vem ordenado (desc)
    const [saving, setSaving] = React.useState(false)
    const [uploading, setUploading] = React.useState(false)
    const [progress, setProgress] = React.useState<Record<string, number>>({})
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const objectUrlsRef = React.useRef<Record<string, string>>({})

    React.useEffect(() => {
        return () => {
            Object.values(objectUrlsRef.current).forEach((u) => URL.revokeObjectURL(u))
            objectUrlsRef.current = {}
        }
    }, [])

    // ===== Upload
    const persistNewPhotos = React.useCallback(async (uploaded: { tempKey: string; url: string; sizeBytes?: number; originalName?: string }[]) => {
        const res = await fetch(`/api/albums/${initial.id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                photos: uploaded.map(({ url, sizeBytes, originalName }) => ({ url, sizeBytes, originalName })),
            }),
        })
        if (!res.ok) {
            alert('Falha ao salvar fotos no banco.')
            // remove os temporários da UI
            setPhotos((prev) => prev.filter((p) => !uploaded.some((u) => u.tempKey === p.clientKey)))
            uploaded.forEach(({ tempKey }) => {
                const u = objectUrlsRef.current[tempKey]
                if (u) URL.revokeObjectURL(u)
                delete objectUrlsRef.current[tempKey]
            })
            return
        }
        const data = await res.json()
        const created: ExistingPhoto[] = (data.photos ?? []).map((p: any) => ({
            id: p.id,
            url: p.url,
            size: p.sizeBytes ?? undefined,
            originalName: p.originalName ?? undefined,
            temp: false,
            clientKey: p.id,
        }))

        setPhotos((prev) => {
            const next = [...prev]
            for (const u of uploaded) {
                const createdPhoto = created.find((c) => c.url === u.url)
                if (!createdPhoto) continue
                const idx = next.findIndex((p) => p.clientKey === u.tempKey)
                if (idx !== -1) {
                    const loc = objectUrlsRef.current[u.tempKey]
                    if (loc) setTimeout(() => URL.revokeObjectURL(loc), 300)
                    delete objectUrlsRef.current[u.tempKey]
                    next[idx] = { ...next[idx], ...createdPhoto }
                } else {
                    next.unshift(createdPhoto) // fallback
                }
            }
            return next
        })

        uploaded.forEach(({ tempKey }) => setProgress((m) => ({ ...m, [tempKey]: 100 })))
    }, [initial.id])

    const handleFiles = React.useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return
        setUploading(true)

        const selected = Array.from(files).filter((f) => f.type.startsWith('image/'))
        const pending = selected.map((file) => {
            const tempKey = `temp-${crypto.randomUUID()}`
            const objectUrl = URL.createObjectURL(file)
            objectUrlsRef.current[tempKey] = objectUrl
            return { tempKey, file, objectUrl }
        })

        // 1) adiciona na UI (no topo) com preview e progress 0
        setPhotos((prev) => [
            ...pending.map(({ tempKey, objectUrl, file }) => ({
                id: tempKey,
                url: objectUrl,
                size: file.size,
                originalName: file.name,
                temp: true,
                clientKey: tempKey,
            })),
            ...prev,
        ])

        // 2) sobe para Blob com barra de progresso
        const uploaded = await Promise.all(
            pending.map(async ({ tempKey, file }) => {
                const result = await upload(file.name, file, {
                    access: 'public',
                    handleUploadUrl: '/api/blob/upload',
                    multipart: file.size > 4_500_000,
                    onUploadProgress: ({ percentage }) => {
                        const pct = Math.min(99, Math.max(0, Math.round(percentage)))
                        setProgress((m) => ({ ...m, [tempKey]: pct }))
                    },
                })
                return { tempKey, url: result.url, sizeBytes: file.size, originalName: file.name }
            }),
        )

        // 3) persiste no Postgres e troca temp->final sem flick (SafeImage)
        await persistNewPhotos(uploaded)
        setUploading(false)
    }, [persistNewPhotos])

    const onDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false)
        void handleFiles(e.dataTransfer?.files ?? null)
    }, [handleFiles])
    const onDragOver = React.useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
    const onDragLeave = React.useCallback(() => setIsDragging(false), [])

    const removePhoto = React.useCallback(async (pid: string) => {
        // não remove temp em upload
        if (pid.startsWith('temp-')) return
        const res = await fetch(`/api/photos/${pid}`, { method: 'DELETE' })
        if (!res.ok) { alert('Falha ao excluir foto'); return }
        setPhotos((prev) => {
            const removed = prev.find((p) => p.id === pid)
            const filtered = prev.filter((p) => p.id !== pid)
            const wasCover = removed?.url && coverPhotoUrl === removed.url
            const nextCover = wasCover ? (filtered[0]?.url ?? null) : coverPhotoUrl
            setCoverPhotoUrl(nextCover ?? null)
            return filtered
        })
    }, [coverPhotoUrl])

    const setCoverById = React.useCallback((pid: string) => {
        if (pid.startsWith('temp-')) return
        const url = photos.find((p) => p.id === pid)?.url ?? null
        setCoverPhotoUrl(url)
    }, [photos])

    // ===== Salvar
    const onSave = React.useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (uploading) return
        setSaving(true)
        const res = await fetch(`/api/albums/${initial.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                albumName,
                pricePerPhotoBRL: priceBRL || '0,00',
                coverPhotoUrl,
            }),
        })
        setSaving(false)
        if (!res.ok) { alert('Não foi possível salvar na API.'); return }
        router.push('/albums?updated=1')
    }, [albumName, priceBRL, coverPhotoUrl, initial.id, router, uploading])

    // ===== Form helpers BRL
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
    const disabledAll = saving || uploading

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

                {/* Dropzone */}
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
                    aria-disabled={disabledAll}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => { void handleFiles(e.target.files); e.currentTarget.value = '' }}
                        disabled={disabledAll}
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
                            onClick={() => { setPhotos([]); setCoverPhotoUrl(null) }}
                            disabled={photos.length === 0 || uploading}
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
                                const isTemp = !!p.temp || p.id.startsWith('temp-')
                                const isCover = coverPhotoUrl === p.url
                                return (
                                    <li key={p.clientKey} className="group overflow-hidden rounded-xl border">
                                        <div className="relative h-40 w-full">
                                            <SafeImage src={p.url} alt={p.originalName ?? p.id} sizes="160px" />

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
                                                        onClick={() => setCoverById(p.id)}
                                                        disabled={isTemp || uploading}
                                                        className="rounded bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur hover:bg-black/80 disabled:opacity-50"
                                                        aria-label="Usar como capa"
                                                    >
                                                        USAR COMO CAPA
                                                    </button>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                aria-label={`Remover ${p.originalName ?? p.id}`}
                                                onClick={() => removePhoto(p.id)}
                                                className="absolute right-2 top-2 z-20 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                                                disabled={isTemp || uploading}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 border-t bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                      <span className="line-clamp-1 break-all" title={p.originalName ?? p.id}>
                        {p.originalName ?? (isTemp ? 'Enviando…' : p.id)}
                      </span>
                                            <span className="shrink-0">{human(p.size)}</span>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
                <Button asChild variant="outline"><Link href={`/albums`}>Cancelar</Link></Button>
                <Button type="submit" disabled={disabledAll}>
                    {saving ? 'Salvando…' : uploading ? 'Aguarde envio…' : 'Salvar alterações'}
                </Button>
            </CardFooter>

            <LoadingOverlay show={saving} label="Salvando alterações…" />
        </form>
    )
}
