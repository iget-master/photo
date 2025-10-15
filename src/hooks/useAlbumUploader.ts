'use client'

import * as React from 'react'
import { upload } from '@vercel/blob/client'
import cuid from 'cuid'
import { nanoid } from 'nanoid'

export type LocalItem = {
    clientKey: string
    tempUrl: string
    finalUrl?: string
    photoId?: string
    name: string
    size: number
}

type ProgressMap = Record<string, number>

function sanitizeFileName(name: string) {
    // mantém espaços; troca caracteres problemáticos
    return name.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 180)
}

export function useAlbumUploader(albumId: string) {
    const [items, setItems] = React.useState<LocalItem[]>([])
    const [inflight, setInflight] = React.useState(0)
    const [progress, setProgress] = React.useState<ProgressMap>({})
    const objectUrlsRef = React.useRef<Record<string, string>>({})

    React.useEffect(() => {
        return () => {
            Object.values(objectUrlsRef.current).forEach((u) => URL.revokeObjectURL(u))
            objectUrlsRef.current = {}
        }
    }, [])

    const addFiles = React.useCallback(async (files: FileList | File[]) => {
        const arr = Array.from(files || [])
        const images = arr.filter((f) => /^(image\/jpeg|image\/png|image\/webp)$/.test(f.type))
        if (images.length === 0) return

        // 1) adiciona na UI (no topo)
        const pending = images.map((file) => {
            const clientKey = cuid() // === ID da Photo no servidor
            const tempUrl = URL.createObjectURL(file)
            objectUrlsRef.current[clientKey] = tempUrl
            return { clientKey, file, tempUrl }
        })

        setItems((prev) => {
            const next: LocalItem[] = [
                ...pending.map(({ clientKey, file, tempUrl }) => ({
                    clientKey,
                    tempUrl,
                    name: file.name,
                    size: file.size,
                })),
                ...prev,
            ]
            // ordena por id desc (cuid ~ tempo)
            next.sort((a, b) => b.clientKey.localeCompare(a.clientKey))
            return next
        })

        // 2) sobe cada arquivo
        setInflight((n) => n + pending.length)

        await Promise.all(
            pending.map(async ({ clientKey, file }) => {
                const safeName = sanitizeFileName(file.name)
                const folder = nanoid() // subpasta aleatória
                try {
                    const result = await upload(
                        // o pathname final é controlado pelo cliente (validado no server)
                        `albums/${albumId}/raw/${folder}/${safeName}`,
                        file,
                        {
                            access: 'public',
                            handleUploadUrl: `/api/albums/${albumId}/upload`,
                            multipart: file.size > 4_500_000,
                            clientPayload: JSON.stringify({
                                id: clientKey,            // o servidor criará Photo.id = clientKey
                                originalName: file.name,
                                size: file.size,
                                contentType: file.type,
                            }),
                            onUploadProgress: ({ percentage }) => {
                                const pct = Math.min(99, Math.max(0, Math.round(percentage)))
                                setProgress((m) => ({ ...m, [clientKey]: pct }))
                            },
                        }
                    )

                    // 3) marca como finalizado na UI
                    setProgress((m) => ({ ...m, [clientKey]: 100 }))
                    setItems((prev) =>
                        prev.map((it) =>
                            it.clientKey === clientKey
                                ? { ...it, finalUrl: result.url, photoId: clientKey } // photoId == cuid
                                : it
                        )
                    )

                    // libera o objectURL após trocar a imagem
                    const loc = objectUrlsRef.current[clientKey]
                    if (loc) {
                        setTimeout(() => URL.revokeObjectURL(loc), 400)
                        delete objectUrlsRef.current[clientKey]
                    }
                } catch (e) {
                    console.error('[upload error]', e)
                    // remove item problemático
                    setItems((prev) => prev.filter((it) => it.clientKey !== clientKey))
                    const loc = objectUrlsRef.current[clientKey]
                    if (loc) URL.revokeObjectURL(loc)
                    delete objectUrlsRef.current[clientKey]
                } finally {
                    setInflight((n) => Math.max(0, n - 1))
                }
            })
        )
    }, [albumId])

    const removeItem = React.useCallback((clientKey: string) => {
        setItems((prev) => {
            const loc = objectUrlsRef.current[clientKey]
            if (loc) URL.revokeObjectURL(loc)
            delete objectUrlsRef.current[clientKey]
            return prev.filter((p) => p.clientKey !== clientKey)
        })
    }, [])

    const clearAll = React.useCallback(() => {
        setItems((prev) => {
            prev.forEach((p) => {
                const loc = objectUrlsRef.current[p.clientKey]
                if (loc) URL.revokeObjectURL(loc)
            })
            return []
        })
        objectUrlsRef.current = {}
        setProgress({})
    }, [])

    return {
        items,
        inflight,
        progress,
        addFiles,
        removeItem,
        clearAll,
        setItems,     // expõe para integrações (ex.: recarregar do backend)
        setProgress,  // idem
    }
}
