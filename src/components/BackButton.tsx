'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BackButton({ label = 'Voltar' }: { label?: string }) {
    const router = useRouter()
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-0 hover:bg-transparent text-foreground/70"
        >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">{label}</span>
        </Button>
    )
}
