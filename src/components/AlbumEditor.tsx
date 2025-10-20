'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Clock,
    Link as LinkIcon,
    QrCode,
    Receipt,
    Trash2,
    Upload,
    Wallpaper,
    X,
    MoreVertical
} from 'lucide-react'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { Spinner } from '@/components/ui/spinner'
import { useAlbumUploader } from '@/hooks/useAlbumUploader'
import { centsToBRL } from '@/helpers/centsToBRL'
import Link from 'next/link'
import { QrCardsDialog } from '@/components/QrCardsDialog'

// ⬇️ shadcn dropdown
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

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
function SafeImage({ src, alt, sizes = '160px' }: { src?: string; alt?: string; sizes?: string }) {
    const [display, setDisplay] = React.useState(src || FALLBACK)

    React.useEffect(() => {
        let canceled = false
        if (!src) { setDisplay(FALLBACK); return }

        const img = new window.Image()
        img.src = src
        const done = () => { if (!canceled) setDisplay(src) }

        const canDecode = 'decode' in HTMLImageElement.prototype
        if (canDecode) {
            ; (img as HTMLImageElement).decode().then(done).catch(done)
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
            alt={alt ?? ''}
            fill
            sizes={sizes}
            className="object-cover transition-opacity duration-300"
        />
    )
}

type Photo = {
    id: string
    originalName?: string | null
    url: string
    urlWatermark?: string | null
    urlThumb?: string | null
    sizeBytes?: number | null
    meta: {
        new: boolean
        temporaryUrl?: string
        deleting?: boolean
    }
}

export type InitialAlbum = {
    id: string
    albumName?: string
    pricePerPhotoCents?: number
    coverPhotoUrl?: string | null
    photos: Photo[]
    meta: {
        new: boolean
    }
}

export default function AlbumEditor({ initial }: { initial: InitialAlbum }) {
    const router = useRouter()

    const {
        photos, inflight, progress,
        addFiles, removePhoto, clearAll, setPhotos,
    } = useAlbumUploader(initial.id, initial.photos)

    const [qrCardsModalOpen, setQrCardsModalOpen] = React.useState(false)
    const [isNew, setIsNew] = React.useState(initial.meta.new);
    const [albumName, setAlbumName] = React.useState(initial.albumName)
    const [priceBRL, setPriceBRL] = React.useState(centsToBRL(initial.pricePerPhotoCents))
    const [coverPhotoUrl, setCoverPhotoUrl] = React.useState<string | null | undefined>(initial.coverPhotoUrl)
    const [saving, setSaving] = React.useState(false)

    const [isDragging, setIsDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    // drag & drop
    const onDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false)
        if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
    }, [addFiles])
    const onDragOver = React.useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
    const onDragLeave = React.useCallback(() => setIsDragging(false), [])

    const removePersistedPhoto = React.useCallback(async (photoId: string) => {
        if (inflight > 0) return

        setPhotos((current) => current.map(
            (photo) => photo.id === photoId ? { ...photo, meta: { ...photo.meta, deleting: true } } : photo
        ));

        const response = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
        if (!response.ok) { alert('Falha ao excluir foto'); return }

        const removed = photos.find((p) => p.id === photoId);
        setCoverPhotoUrl((current) => (current === removed?.url) ? '' : current)
        removePhoto(photoId);
    }, [photos, inflight, setPhotos, removePhoto])

    const setCoverPhoto = React.useCallback((photoId: string) => {
        const photo = photos.find((x) => x.id === photoId)
        if (photo && !photo?.meta.new) {
            setCoverPhotoUrl(photo.url)
        }
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

    }, [albumName, priceBRL, coverPhotoUrl, inflight, initial.id, router, isNew])

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
        <Card>
            <form onSubmit={onSave}>
                <CardHeader>
                    <div className="flex justify-between gap-2 mb-2 flex-wrap">
                        <CardTitle className="text-lg grow">Dados do álbum</CardTitle>
                        <QrCardsDialog
                            noButton
                            albumId={initial.id}
                            open={qrCardsModalOpen}
                            setOpenAction={setQrCardsModalOpen}
                        />

                        {!isNew && (
                            <>
                                <div className="hidden md:flex gap-2 flex-wrap">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="hover:bg-transparent cursor-pointer"
                                        aria-label="QR Cards"
                                        title="QR Cards"
                                        onClick={() => setQrCardsModalOpen(true)}
                                    >
                                        <QrCode className="h-5 w-5" />
                                        QR Cards
                                    </Button>

                                    <Button
                                        asChild
                                        variant="outline"
                                        className="hover:bg-transparent"
                                        aria-label="Abrir página pública"
                                        title="Abrir página pública"
                                    >
                                        <Link href={`/public/album/${initial.id}`}>
                                            <LinkIcon className="h-5 w-5" />
                                            Ver álbum
                                        </Link>
                                    </Button>

                                    <Button
                                        asChild
                                        variant="outline"
                                        className="hover:bg-transparent"
                                        aria-label="Ver pedidos"
                                        title="Ver pedidos"
                                    >
                                        <Link href={`/albums/${initial.id}/orders`}>
                                            <Receipt className="h-5 w-5" />
                                            Compras
                                        </Link>
                                    </Button>
                                </div>
                                <div className="md:hidden order-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="hover:bg-transparent"
                                                aria-label="Mais opções"
                                                title="Mais opções"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                                <span className="sr-only">Abrir menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="min-w-40">
                                            <DropdownMenuItem onClick={() => setQrCardsModalOpen(true)}>
                                                <QrCode className="mr-2 h-4 w-4" />
                                                <span>QR Cards</span>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem asChild>
                                                <Link href={`/public/album/${initial.id}`}>
                                                    <LinkIcon className="mr-2 h-4 w-4" />
                                                    <span>Ver álbum</span>
                                                </Link>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem asChild>
                                                <Link href={`/albums/${initial.id}/orders`}>
                                                    <Receipt className="mr-2 h-4 w-4" />
                                                    <span>Compras</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </>
                        )}

                        <Button type="submit" disabled={disabledAll}>
                            {saving ? (isNew ? 'Criando…' : 'Salvando…') : inflight > 0 ? 'Aguarde envio…' : (isNew ? 'Criar' : 'Salvar')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-3">
                            <Label htmlFor="albumName">Nome do Álbum</Label>
                            <Input id="albumName" value={albumName} onChange={(e) => setAlbumName(e.target.value)} />
                        </div>
                        <div className="space-y-3">
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

                            <div>
                                <div className="mb-4 flex items-center justify-between">
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
                                            const photoProgress = progress[p.id]
                                            const url = p.urlThumb || p.url || p.meta?.temporaryUrl;
                                            const isCover = coverPhotoUrl === p.url;
                                            const uploading = photoProgress && photoProgress < 100;

                                            return (
                                                <li key={p.id} className="group overflow-hidden rounded-xl border">
                                                    <div className="relative h-40 w-full">
                                                        <SafeImage src={url} sizes="160px" />

                                                        {(uploading || p.meta.deleting) && (
                                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/35 backdrop-blur-[1px]">
                                                                <Spinner size={22} />

                                                                <span className="text-[11px] text-white/90">
                                  {uploading ?
                                      `Enviando ${photoProgress}%` :
                                      `Excluindo…`}
                                </span>
                                                            </div>
                                                        )}

                                                        {photoProgress && (
                                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                                                                <div className="h-full bg-white/80" style={{ width: `${photoProgress}%` }} />
                                                            </div>
                                                        )}

                                                        {(!p.urlThumb || !p.urlWatermark) && (
                                                            <div className="absolute bottom-2 left-2 z-20">
                                <span className="group inline-flex items-center rounded bg-black/50 px-1 py-1 text-[10px] font-semibold tracking-wide text-white shadow leading-none">
                                  <Clock size={16} className="shrink-0 text-white mr-1" strokeWidth={2} aria-hidden />
                                  Processando
                                </span>
                                                            </div>
                                                        )}

                                                        <div className="absolute left-2 top-2 z-20">
                                                            <button
                                                                type="button"
                                                                onClick={() => setCoverPhoto(p.id)}
                                                                disabled={inflight > 0}
                                                                aria-label={isCover ? "Capa atual" : "Usar como capa"}
                                                                className={
                                                                    "transition group-hover:opacity-100 group inline-flex items-center rounded px-1 py-1 text-[10px] font-semibold tracking-wide text-white shadow leading-none " +
                                                                    (isCover ? 'bg-emerald-600/90' : 'opacity-0 bg-black/70 cursor-pointer')
                                                                }
                                                            >
                                                                <Wallpaper size={16} className="shrink-0 text-white" strokeWidth={2} aria-hidden />
                                                                {isCover && (
                                                                    <span className="ml-1 overflow-hidden">
                                    Capa
                                  </span>
                                                                )}
                                                            </button>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            aria-label={`Remover foto`}
                                                            onClick={() => removePersistedPhoto(p.id)}
                                                            className="absolute right-2 top-2 z-20 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                                                            disabled={inflight > 0}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-2 border-t bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                            <span className="line-clamp-1 break-all" title={p.originalName ?? ''}>
                              {p.originalName}
                            </span>
                                                        <span className="shrink-0">{human(p.sizeBytes ?? 0)}</span>
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

                <LoadingOverlay show={saving} label={isNew ? "Criando album…" : "Salvando alterações…"} />
            </form>
        </Card>
    )
}
