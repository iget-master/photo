'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { Spinner } from '@/components/ui/spinner'

// ===== Utils
function humanFileSize(bytes: number) {
    const thresh = 1024
    if (Math.abs(bytes) < thresh) return bytes + ' B'
    const units = ['KB', 'MB', 'GB', 'TB']
    let u = -1
    do { bytes /= thresh; ++u } while (Math.abs(bytes) >= thresh && u < units.length - 1)
    return bytes.toFixed(1) + ' ' + units[u]
}
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
function parseBRL(input: string): number {
    if (!input) return 0
    const normalized = input.replace(/\./g, '').replace(',', '.')
    const n = Number(normalized)
    return isNaN(n) ? 0 : n
}

// Placeholder cinza para imagem
const FALLBACK_DATA_URL =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iOTYiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgc3R5bGU9ImZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7Zm9udC1zaXplOjEwcHgiPnByZXZpZXc8L3RleHQ+PC9zdmc+'

// Troca de src sem flick
function SafeImage({ src, alt }: { src: string; alt: string; }) {
    const [displaySrc, setDisplaySrc] = useState(src || FALLBACK_DATA_URL)
    useEffect(() => {
        if (!src) { setDisplaySrc(FALLBACK_DATA_URL); return }
        const img = new window.Image()
        img.src = src
        const done = () => setDisplaySrc(src)
        if ('decode' in img && typeof (img as any).decode === 'function') {
            ;(img as any).decode().then(done).catch(done)
        } else {
            img.onload = done
            img.onerror = () => setDisplaySrc(FALLBACK_DATA_URL)
        }
    }, [src])
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displaySrc} alt={alt} className="h-40 w-full object-cover transition-opacity duration-300" />
    )
}

// ===== Types
type LocalItem = {
    clientKey: string        // chave estável para UI
    tempUrl: string          // objectURL enquanto envia
    finalUrl?: string        // url Blob final (após upload)
    photoId?: string         // id retornado por POST /api/photos
    name: string
    size: number
}

export default function AlbumCreatePage() {
    const router = useRouter()

    const [albumName, setAlbumName] = useState('')
    const [pricePerPhoto, setPricePerPhoto] = useState('') // "pt-BR" (ex.: "15,00")

    const [items, setItems] = useState<LocalItem[]>([])   // mais recentes primeiro
    const [isDragging, setIsDragging] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitLabel, setSubmitLabel] = useState<string | undefined>(undefined)

    // upload em andamento (contador)
    const [inflight, setInflight] = useState(0)

    const inputRef = useRef<HTMLInputElement | null>(null)
    const objectUrlsRef = useRef<Record<string, string>>({})

    // ===== Progresso suave
    const [progress, setProgress] = useState<Record<string, number>>({})
    type AnimEntry = { value: number; target: number; raf?: number }
    const progressAnimRef = useRef<Record<string, AnimEntry>>({})

    useEffect(() => {
        return () => {
            Object.values(progressAnimRef.current).forEach((e) => e?.raf && cancelAnimationFrame(e.raf))
            progressAnimRef.current = {}
            Object.values(objectUrlsRef.current).forEach((u) => URL.revokeObjectURL(u))
            objectUrlsRef.current = {}
        }
    }, [])

    const setProgressSmooth = useCallback((key: string, target: number) => {
        target = Math.max(0, Math.min(100, Math.round(target)))
        const store = progressAnimRef.current
        const entry = store[key] ?? { value: 0, target: 0, raf: undefined }
        entry.target = Math.max(entry.target, target)
        if (!entry.raf) {
            const tick = () => {
                const e = store[key]
                if (!e) return
                const diff = e.target - e.value
                if (diff <= 0) { e.raf = undefined; return }
                const step = Math.max(1, Math.round(diff * 0.15))
                e.value += step
                setProgress((m) => ({ ...m, [key]: e.value }))
                e.raf = requestAnimationFrame(tick)
            }
            entry.raf = requestAnimationFrame(tick)
        }
        store[key] = entry
    }, [])

    const finishProgress = useCallback((key: string) => {
        setProgressSmooth(key, 100)
        setTimeout(() => {
            const e = progressAnimRef.current[key]
            if (e?.raf) cancelAnimationFrame(e.raf)
            delete progressAnimRef.current[key]
        }, 800)
    }, [setProgressSmooth])

    // ===== Price mask
    const handlePriceChange = useCallback((raw: string) => {
        const digits = raw.replace(/\D/g, '')
        if (!digits) { setPricePerPhoto(''); return }
        const value = (parseInt(digits, 10) / 100).toFixed(2)
        setPricePerPhoto(value.replace('.', ','))
    }, [])
    const handlePriceBlur = useCallback((raw: string) => {
        if (!raw) return
        const n = parseBRL(raw)
        setPricePerPhoto(n.toFixed(2).replace('.', ','))
    }, [])

    const uploadOne = useCallback(async (clientKey: string, file: File) => {
        setInflight((n) => n + 1)
        try {
            // 1) Upload para Blob (progresso suave, tranca em 99%)
            const result = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/blob/upload',
                multipart: file.size > 4_500_000,
                onUploadProgress: ({ percentage }) => {
                    const target = Math.min(99, Math.round(percentage))
                    setProgressSmooth(clientKey, target)
                },
            })

            const finalUrl = result.url

            // 2) Cria foto órfã no banco (recebe ID da foto)
            const res = await fetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: finalUrl, sizeBytes: file.size, originalName: file.name }),
            })
            if (!res.ok) throw new Error('Falha ao criar foto no banco')
            const created = await res.json() as { id: string; url: string }

            // 3) Atualiza item (mantém clientKey, troca para URL final e salva photoId)
            setItems((prev) =>
                prev.map((it) =>
                    it.clientKey === clientKey
                        ? { ...it, finalUrl, photoId: created.id }
                        : it,
                ),
            )

            // libera objectURL (um pouquinho depois para evitar flick raro)
            const loc = objectUrlsRef.current[clientKey]
            if (loc) setTimeout(() => URL.revokeObjectURL(loc), 400)
            delete objectUrlsRef.current[clientKey]

            finishProgress(clientKey)
        } catch (err) {
            console.error(err)
            // rollback: remove item problemático
            setItems((prev) => prev.filter((it) => it.clientKey !== clientKey))
            const loc = objectUrlsRef.current[clientKey]
            if (loc) URL.revokeObjectURL(loc)
            delete objectUrlsRef.current[clientKey]
            // opcional: toast/alert
        } finally {
            setInflight((n) => Math.max(0, n - 1))
        }
    }, [finishProgress, setProgressSmooth])

    // ===== Files
    const addLocalItems = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) return
        const pending = Array.from(files)
            .filter((f) => f.type.startsWith('image/'))
            .map((file) => {
                const clientKey = `temp-${crypto.randomUUID()}`
                const tempUrl = URL.createObjectURL(file)
                objectUrlsRef.current[clientKey] = tempUrl
                return { clientKey, tempUrl, name: file.name, size: file.size, file }
            })

        // adiciona no topo (mais recentes primeiro)
        setItems((prev) => {
            const next: LocalItem[] = pending.map((p) => ({
                clientKey: p.clientKey,
                tempUrl: p.tempUrl,
                name: p.file.name,
                size: p.file.size,
            }))
            return [...next, ...prev]
        })

        pending.forEach(({ clientKey, file }) => uploadOne(clientKey, file))
    }, [uploadOne])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer?.files) addLocalItems(e.dataTransfer.files)
    }, [addLocalItems])

    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
    const onDragLeave = useCallback(() => setIsDragging(false), [])

    const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        addLocalItems(files)
        e.target.value = '' // reset para permitir re-selecionar o MESMO arquivo
    }, [addLocalItems])

    const removeItem = useCallback((clientKey: string) => {
        // se estiver em upload, opcionalmente bloquear
        setItems((prev) => {
            const target = prev.find((p) => p.clientKey === clientKey)
            if (target) {
                const loc = objectUrlsRef.current[clientKey]
                if (loc) URL.revokeObjectURL(loc)
                delete objectUrlsRef.current[clientKey]
            }
            return prev.filter((p) => p.clientKey !== clientKey)
        })
    }, [])

    const clearAll = useCallback(() => {
        setItems((prev) => {
            prev.forEach((p) => {
                if (p.tempUrl) URL.revokeObjectURL(p.tempUrl)
            })
            return []
        })
        objectUrlsRef.current = {}
    }, [])

    const canSubmit = useMemo(() => {
        // fotos são opcionais; porém bloqueia submit se houver uploads em andamento
        return albumName.trim().length > 1 && parseBRL(pricePerPhoto) >= 0 && inflight === 0
    }, [albumName, pricePerPhoto, inflight])

    const totalEstimate = useMemo(() => {
        const count = items.filter((i) => i.photoId).length
        const price = parseBRL(pricePerPhoto)
        if (count === 0 || price <= 0) return null
        return brl.format(count * price)
    }, [items, pricePerPhoto])

    // ===== Submit
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit || submitting) return
        setSubmitting(true)

        try {
            setSubmitLabel('Criando álbum…')

            const uploaded = items.filter((i) => !!i.photoId)
            const photoIds = uploaded.map((i) => i.photoId!)  // associar essas fotos
            const coverPhotoUrl = uploaded[0]?.finalUrl ?? null

            const res = await fetch('/api/albums', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    albumName,
                    pricePerPhotoBRL: pricePerPhoto,
                    photoIds,
                    coverPhotoUrl, // define capa já na criação (se houver fotos)
                }),
            })
            if (!res.ok) throw new Error('Falha ao criar álbum')
            const data = await res.json() as { id: string }

            router.push(`/albums/${data.id}/edit`)
        } catch (err) {
            console.error(err)
            alert('Não foi possível criar o álbum.')
        } finally {
            setSubmitting(false)
            setSubmitLabel(undefined)
        }
    }, [albumName, pricePerPhoto, items, canSubmit, submitting, router])

    return (
        <div className="mx-auto max-w-5xl p-6">
            <Card className="border-muted-foreground/20 relative">
                <CardHeader>
                    <CardTitle className="text-2xl">Criar novo álbum</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Você pode enviar as fotos <b>antes</b> de salvar o álbum. Elas serão associadas na criação.
                    </p>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="albumName">Nome do Álbum</Label>
                                <Input
                                    id="albumName"
                                    placeholder="Ex.: Corrida de Rua Fortaleza 2025"
                                    value={albumName}
                                    onChange={(e) => setAlbumName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pricePerPhoto">Valor por Foto (R$)</Label>
                                <Input
                                    id="pricePerPhoto"
                                    inputMode="numeric"
                                    placeholder="0,00"
                                    value={pricePerPhoto}
                                    onChange={(e) => handlePriceChange(e.target.value)}
                                    onBlur={(e) => handlePriceBlur(e.target.value)}
                                    required
                                />
                                {items.length > 0 && totalEstimate && (
                                    <p className="text-xs text-muted-foreground">
                                        Estimativa: {items.filter(i => i.photoId).length} foto(s) × {brl.format(parseBRL(pricePerPhoto))} ={' '}
                                        <span className="font-medium">{totalEstimate}</span>
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
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={onInputChange}
                            />
                            <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
                                <div className="rounded-full border p-3"><Upload className="h-6 w-6" aria-hidden /></div>
                                <p className="text-sm">
                                    Arraste suas fotos aqui ou <span className="font-semibold underline">clique para selecionar</span>
                                </p>
                                <p className="text-xs text-muted-foreground">As fotos enviadas já ficam salvas e ganharão um ID.</p>
                            </div>
                        </div>

                        {/* Grid de previews / enviados */}
                        {items.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {items.length} arquivo(s)
                                    </p>
                                    <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Limpar tudo (somente da tela)
                                    </Button>
                                </div>
                                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                                    {items.map((it) => {
                                        const pct = progress[it.clientKey]
                                        const uploading = pct !== undefined && pct < 100
                                        const displayUrl = it.finalUrl ?? it.tempUrl
                                        return (
                                            <li key={it.clientKey} className="group overflow-hidden rounded-xl border">
                                                <div className="relative h-40 w-full">
                                                    <SafeImage src={displayUrl} alt={it.name} />

                                                    {uploading && (
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

                                                    <button
                                                        type="button"
                                                        aria-label={`Remover ${it.name}`}
                                                        onClick={() => removeItem(it.clientKey)}
                                                        className="absolute right-2 top-2 z-20 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between gap-2 border-t bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                          <span className="line-clamp-1 break-all" title={it.name}>
                            {it.name}
                          </span>
                                                    <span className="shrink-0">{humanFileSize(it.size)}</span>
                                                </div>

                                                <div className="px-2 pb-2 text-[10px] text-muted-foreground">
                                                    {it.photoId ? (
                                                        <span className="text-emerald-700">ID: {it.photoId}</span>
                                                    ) : (
                                                        <span className="text-amber-700">Gerando ID…</span>
                                                    )}
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={clearAll} disabled={items.length === 0}>
                            Limpar seleção
                        </Button>
                        <Button type="submit" disabled={!canSubmit || submitting}>
                            {submitting ? 'Processando…' : inflight > 0 ? 'Aguarde envio…' : 'Criar álbum'}
                        </Button>
                    </CardFooter>
                </form>

                <LoadingOverlay show={submitting} label={submitLabel} />
            </Card>
        </div>
    )
}
