// src/lib/imaging.ts
import sharp from 'sharp'

export async function makeWatermark(input: Buffer) {
    // base: limita o lado maior a ~1600px e remove metadados
    const base = sharp(input).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true })

    // pega dimensões reais após o resize
    const meta = await base.metadata()
    const w = Math.max(600, meta.width ?? 1600)
    const h = Math.max(400, meta.height ?? 1600)

    // dimensões do “tijolo” do padrão (mais denso = watermark mais visível)
    const cellW = Math.round(w / 3)         // 3 repetições na largura
    const cellH = Math.round(h / 3.5)       // ~3–4 repetições na altura
    const fontSize = Math.round(Math.min(cellH * 0.6, cellW * 0.35)) // proporcional ao bloco
    const textY = Math.round(cellH * 0.7)   // posição do baseline dentro do bloco
    const strokeW = Math.max(2, Math.round(fontSize * 0.06))

    // SVG com repetição, levemente diagonal, stroke escuro + fill claro (contraste em qualquer fundo)
    const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <pattern id="wm" width="${cellW}" height="${cellH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <text x="0" y="${textY}" font-size="${fontSize}" font-family="sans-serif"
            fill="#ffffff" fill-opacity="0.26"
            stroke="#000000" stroke-opacity="0.18" stroke-width="${strokeW}"
            paint-order="stroke fill">
            AMOSTRA
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm)"/>
    </svg>
  `)

    // compõe o SVG no centro (tamanho do SVG == tamanho da imagem ⇒ sem erro de dimensões)
    const out = await base
        .composite([{ input: svg, gravity: 'centre' }])
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer()

    return out
}


export async function makeThumb(input: Buffer) {
    // ~300px lado maior, baixa qualidade
    return sharp(input).rotate().resize({ width: 300, withoutEnlargement: true }).jpeg({ quality: 60, mozjpeg: true }).toBuffer()
}
