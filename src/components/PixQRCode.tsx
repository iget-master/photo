'use client'

import * as React from 'react'

type Props = { payload: string; size?: number; margin?: number }

export default function PixQRCode({ payload, size = 240, margin = 1 }: Props) {
    const ref = React.useRef<HTMLCanvasElement | null>(null)

    React.useEffect(() => {
        let canceled = false
        async function draw() {
            try {
                const QR = await import('qrcode')
                if (canceled || !ref.current) return
                await QR.toCanvas(ref.current, payload, { width: size, margin, errorCorrectionLevel: 'M' } as any)
            } catch {}
        }
        if (payload) draw()
        return () => { canceled = true }
    }, [payload, size, margin])

    return <canvas ref={ref} className="rounded bg-white p-2" aria-label="QR Code PIX" />
}
