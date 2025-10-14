'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function ApproveButton({ orderId }: { orderId: string }) {
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()
    const onClick = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/orders/${orderId}/approve`, { method: 'PATCH' })
            if (!res.ok) throw new Error()
            router.refresh()
        } catch {
            alert('Falha ao aprovar pagamento.')
        } finally {
            setLoading(false)
        }
    }
    return (
        <Button size="sm" onClick={onClick} disabled={loading}>
            {loading ? 'Aprovando…' : 'Aprovar PIX'}
        </Button>
    )
}
