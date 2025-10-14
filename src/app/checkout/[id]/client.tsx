'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import QRCode from 'qrcode'

export default function CheckoutClient({ orderId, totalBRL }: { orderId: string; totalBRL: number }) {
    const [cpf, setCpf] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [payload, setPayload] = React.useState<string | null>(null)
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

    const formatCpfMask = (v: string) =>
        v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')

    const handleGen = async () => {
        const clean = cpf.replace(/\D/g, '')
        if (clean.length !== 11) {
            alert('CPF inválido')
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`/api/orders/${orderId}/pix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || 'Falha ao gerar PIX')
            setPayload(data.payload)
            // desenha QR no canvas
            if (canvasRef.current) {
                await QRCode.toCanvas(canvasRef.current, data.payload, { width: 240, margin: 1 })
            }
        } catch {
            alert('Não foi possível gerar o QR Code.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <div>
                    <label htmlFor="cpf" className="mb-1 block text-sm font-medium">CPF do pagador</label>
                    <Input
                        id="cpf"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={formatCpfMask(cpf)}
                        onChange={(e) => setCpf(e.target.value)}
                        disabled={!!payload || loading}
                    />
                </div>
                <div className="flex items-end">
                    <Button onClick={handleGen} disabled={loading || !!payload}>
                        {loading ? 'Gerando…' : 'Gerar PIX'}
                    </Button>
                </div>
            </div>

            {payload && (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border p-4">
                    <canvas ref={canvasRef} className="rounded bg-white p-2" />
                    <div className="text-sm text-muted-foreground">
                        Pague <b>R$ {totalBRL.toFixed(2).replace('.', ',')}</b> via PIX. Após o pagamento, o fotógrafo aprovará manualmente.
                    </div>
                    <details className="w-full text-xs text-muted-foreground">
                        <summary className="cursor-pointer">Ver payload (mock)</summary>
                        <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2">{payload}</pre>
                    </details>
                </div>
            )}
        </div>
    )
}
