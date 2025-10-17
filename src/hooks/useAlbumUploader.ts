'use client'

import * as React from 'react'
import { upload } from '@vercel/blob/client'
import cuid from 'cuid'
import { nanoid } from 'nanoid'

type ProgressMap = Record<string, number>

type Photo = {
    id: string
    originalName?: string|null
    url?: string
    urlWatermark?: string|null
    urlThumb?: string|null
    sizeBytes?: number|null
    meta: {
        new: boolean
        temporaryUrl?: string
        deleting?: boolean
    }
}

function sanitizeFileName(name: string) {
    return name.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 180)
}

export function useAlbumUploader(albumId: string, initialPhotos: Array<Photo>) {
    const [photos, setPhotos] = React.useState<Photo[]>(initialPhotos)
    const [pendingUploadCount, setPendingUploadCount] = React.useState(0)
    const [progress, setProgress] = React.useState<ProgressMap>({})
    const objectUrlsRef = React.useRef<Record<string, string>>({})

    React.useEffect(() => {
        return () => {
            Object.values(objectUrlsRef.current).forEach((u) => URL.revokeObjectURL(u))
            objectUrlsRef.current = {}
        }
    }, []);

    const revokeObjectURLByPhotoId = React.useCallback((photoId: string, timeout = 0) => {
        const objectURL = objectUrlsRef.current[photoId]
        if (objectURL) {
            setTimeout(() => URL.revokeObjectURL(objectURL), timeout)
            delete objectUrlsRef.current[objectURL]
        }
    }, []);

    const removePhoto = React.useCallback((photoId: string) => {
        setPhotos((previousPhoto) => {
            revokeObjectURLByPhotoId(photoId);
            return previousPhoto.filter((p) => p.id !== photoId)
        })
    }, [])

    const addFiles = React.useCallback(async (files: FileList | File[]) => {
        const arr = Array.from(files || [])
        const images = arr.filter((f) => /^(image\/jpeg|image\/png|image\/webp)$/.test(f.type))
        if (images.length === 0) return

        // 1) adiciona na UI (no topo)
        const pendingUploadPhotos = images.map((file) => {
            const temporaryUrl = URL.createObjectURL(file);
            const id = cuid();
            objectUrlsRef.current[id] = temporaryUrl;

            return {
                id,
                file,
                temporaryUrl,
            }
        })

        setPhotos((prev) => {
            const next: Photo[] = [
                ...pendingUploadPhotos.map(({ id, file, temporaryUrl }) => ({
                    id,
                    originalName: file.name,
                    sizeBytes: file.size,
                    meta: {
                        new: true,
                        temporaryUrl
                    }
                })),
                ...prev,
            ]

            next.sort((a, b) => b.id.localeCompare(a.id))
            return next
        })

        setPendingUploadCount((n) => n + pendingUploadPhotos.length)

        await Promise.all(
            pendingUploadPhotos.map(async ({ id, file }) => {
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
                                id,
                                originalName: file.name,
                                size: file.size,
                                contentType: file.type,
                            }),
                            onUploadProgress: ({ percentage }) => {
                                const pct = Math.min(99, Math.max(0, Math.round(percentage)))
                                setProgress((m) => ({ ...m, [id]: pct }))
                            },
                        }
                    )

                    const response = await fetch(`/api/albums/${albumId}/photos`, {
                        method: 'PATCH',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            photos: [{
                                id,
                                originalName: file.name,
                                sizeBytes: file.size,
                                url: result.url
                            }]
                        })
                    });

                    if (!response.ok) {
                        throw 'Failed to save Photo on API';
                    }

                    // 3) marca como finalizado na UI
                    setProgress((m) => ({ ...m, [id]: 100 }))
                    setPhotos((prev) => {
                            return prev.map((it) =>
                                it.id === id
                                    ? { ...it, url: result.url, photoId: id, meta: { new: false } }
                                    : it
                            )
                    })

                    revokeObjectURLByPhotoId(id, 400);
                } catch (e) {
                    console.error('[upload error]', e)
                    removePhoto(id);
                } finally {
                    setPendingUploadCount((n) => Math.max(0, n - 1))
                }
            })
        )
    }, [albumId])

    const clearAll = React.useCallback(() => {
        setPhotos((prev) => {
            prev.forEach((p) => {
                revokeObjectURLByPhotoId(p.id);
            })
            return []
        })
        setProgress({})
    }, [])

    return {
        photos,
        inflight: pendingUploadCount,
        progress,
        addFiles,
        removePhoto,
        clearAll,
        setPhotos,
        setProgress,
    }
}
