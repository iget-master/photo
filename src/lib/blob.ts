// src/lib/blob.ts
import crypto from 'crypto'
import { put } from '@vercel/blob'

export function randomKey(prefix?: string) {
    const bytes = crypto.randomBytes(16).toString('hex') // 128 bits
    return prefix ? `${prefix}${bytes}.jpg` : `${bytes}.jpg`
}

export async function uploadBufferToBlob(buffer: Buffer, keyPrefix?: string) {
    const pathname = randomKey(keyPrefix)

    const { url } = await put(pathname, buffer, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false })

    return url
}
