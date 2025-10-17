export const centsToBRL = (cents: number | null | undefined) => {
    const n = typeof cents === 'number' ? cents : 0
    return (n / 100).toFixed(2).replace('.', ',')
}