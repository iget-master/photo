// app/albums/[albumId]/VisitPinger.tsx
'use client'

import { useEffect } from 'react'

export default function VisitPinger({ albumId }: { albumId: string }) {
    useEffect(() => {
        fetch(`/api/albums/${albumId}/visit`, { method: 'POST' }).catch(() => {})
    }, [albumId])

    return null
}
