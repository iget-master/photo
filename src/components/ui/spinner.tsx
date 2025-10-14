export function Spinner({ size = 24 }: { size?: number }) {
    const s = `${size}px`
    return (
        <div
            className="animate-spin rounded-full border-2 border-muted-foreground/30 border-t-2 border-t-foreground"
            style={{ width: s, height: s }}
            aria-hidden
        />
    )
}
