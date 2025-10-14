'use client'

import * as React from 'react'

type Props = {
    show: boolean
    label?: string
    /** 0–100. Se informado, mostra barra de progresso determinística. */
    progress?: number
    /** Personalize a opacidade do fundo (0–100). Padrão 70. */
    backdropOpacity?: number
}

export function LoadingOverlay({
                                   show,
                                   label = 'Carregando…',
                                   progress,
                                   backdropOpacity = 70,
                               }: Props) {
    if (!show) return null

    const clamped = typeof progress === 'number'
        ? Math.max(0, Math.min(100, Math.round(progress)))
        : undefined

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={label}
            className={`absolute inset-0 z-50 flex items-center justify-center bg-background/${backdropOpacity} backdrop-blur-sm`}
            style={{ pointerEvents: 'auto' }} // captura cliques e bloqueia o card
        >
            <div className="flex min-w-[220px] max-w-[90%] flex-col items-center gap-3 rounded-xl border bg-card/95 p-4 shadow-lg">
                {/* Spinner quando não há progresso determinístico */}
                {typeof clamped !== 'number' ? (
                    <div
                        className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-2 border-t-foreground"
                        aria-hidden
                    />
                ) : (
                    <div className="w-full">
                        <div className="mb-1 text-center text-xs text-muted-foreground">
                            {clamped}%
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-foreground transition-[width] duration-200"
                                style={{ width: `${clamped}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="text-sm">{label}</div>
            </div>
        </div>
    )
}
