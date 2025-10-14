import sharp from 'sharp'

export async function makeWatermark(input: Buffer) {
    const { data: baseBuf, info } = await sharp(input)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer({ resolveWithObject: true })

    const BW = info.width!
    const BH = info.height!

    const cellW = Math.round(BW / 3)
    const cellH = Math.round(BH / 3.5)
    const fontSize = Math.round(Math.min(cellH * 0.6, cellW * 0.35))
    const textY = Math.round(cellH * 0.7)
    const strokeW = Math.max(2, Math.round(fontSize * 0.06))

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${BW}" height="${BH}" viewBox="0 0 ${BW} ${BH}">
      <defs>
        <pattern id="wm" width="${cellW}" height="${cellH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <text x="0" y="${textY}" font-size="${fontSize}" font-family="sans-serif"
            fill="#ffffff" fill-opacity="0.26"
            stroke="#000000" stroke-opacity="0.18" stroke-width="${strokeW}"
            paint-order="stroke fill">AMOSTRA</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm)"/>
    </svg>
  `

    const overlayPng = await sharp(Buffer.from(svg), { density: 300 })
        .resize({ width: BW, height: BH, fit: 'fill' }) // garante <= base
        .png()
        .toBuffer()

    const out = await sharp(baseBuf)
        .composite([{ input: overlayPng, left: 0, top: 0 }])
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer()

    return out
}

export async function makeThumb(input: Buffer) {
    return sharp(input)
        .rotate()
        .resize({ width: 300, withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: 60, mozjpeg: true })
        .toBuffer()
}
