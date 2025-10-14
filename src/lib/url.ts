export function absoluteUrl(path: string) {
    // 1) Priorize uma base explícita
    const explicit = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
    if (explicit) return new URL(path, explicit).toString()

    // 2) Vercel (preview/prod): VERCEL_URL = "project.vercel.app"
    if (process.env.VERCEL_URL) {
        return new URL(path, `https://${process.env.VERCEL_URL}`).toString()
    }

    // 3) Dev local
    return new URL(path, "http://localhost:3000").toString()
}