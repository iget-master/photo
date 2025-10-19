import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Gera um PDF A4 com cartões quadrados (default 5x5 cm) contendo um QR Code
 * apontando para a página pública do álbum. Cada cartão tem título no topo
 * (default "Pegue aqui suas fotos!") e rodapé opcional.
 *
 * GET /api/albums/:id/qrcards?title=...&footer=...&sizeCm=5&gutterMm=4&footerSize=8
 *
 * - title (opcional): texto no topo (default: "Pegue aqui suas fotos!")
 * - footer (opcional): texto no rodapé
 * - sizeCm (opcional): lado do cartão em cm (default: 5)
 * - gutterMm (opcional): espaçamento entre cartões em mm (default: 4)
 * - footerSize (opcional): tamanho da fonte do rodapé (default: 8)
 */
export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // ✅ aguarda a Promise
        if (!id) {
            return NextResponse.json({ error: "id ausente" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const title = searchParams.get("title") ?? "Pegue aqui suas fotos!";
        const footer = searchParams.get("footer") ?? ""; // vazio = sem rodapé
        const sizeCm = Number(searchParams.get("sizeCm") ?? 5);
        const gutterMm = Number(searchParams.get("gutterMm") ?? 4);
        const footerSizeParam = Number(searchParams.get("footerSize") ?? 8);

        const origin = request.nextUrl.origin;
        const albumUrl = new URL(`public/album/${id}`, origin).toString();

        const CM_TO_PT = 72 / 2.54; // 1in = 72pt; 1in = 2.54cm
        const MM_TO_PT = 72 / 25.4;

        const cardSize = sizeCm * CM_TO_PT;
        const gutter = gutterMm * MM_TO_PT;

        const A4_WIDTH = 595.276; // 210mm
        const A4_HEIGHT = 841.89; // 297mm

        const MARGIN = 18; // ~0.25in

        const usableW = A4_WIDTH - MARGIN * 2;
        const usableH = A4_HEIGHT - MARGIN * 2;

        const cols = Math.max(1, Math.floor((usableW + gutter) / (cardSize + gutter)));
        const rows = Math.max(1, Math.floor((usableH + gutter) / (cardSize + gutter)));

        const totalW = cols * cardSize + (cols - 1) * gutter;
        const totalH = rows * cardSize + (rows - 1) * gutter;
        const startX = (A4_WIDTH - totalW) / 2;
        const startY = A4_HEIGHT - (A4_HEIGHT - totalH) / 2 - cardSize; // começa do topo

        const pdf = await PDFDocument.create();
        const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);

        const qrDataUrl = await QRCode.toDataURL(albumUrl, {
            errorCorrectionLevel: "M",
            margin: 0,
            scale: 8,
        });

        const base64 = qrDataUrl.split(",")[1];
        const qrPngBytes =
            typeof Buffer !== "undefined"
                ? Buffer.from(base64, "base64")
                : Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const qrImage = await pdf.embedPng(qrPngBytes as any);

        const padding = 10; // pt
        const titleSize = title ? 10 : 0;
        const footerSize = footer ? (Number.isFinite(footerSizeParam) ? footerSizeParam : 8) : 0;

        const TITLE_GAP = 6;
        const FOOTER_GAP = 6;

        const titleBlock  = title  ? font.heightAtSize(titleSize)  + TITLE_GAP : 0;
        const footerBlock = footer ? font.heightAtSize(footerSize) + FOOTER_GAP : 0;

        const innerBottomY = (y: number) => y + padding + footerBlock;
        const innerHeight  = () => cardSize - padding * 2 - titleBlock - footerBlock;

        const maxTextWidth = (text: string, size: number) => font.widthOfTextAtSize(text, size);

        function drawFittedSingleLine(
            text: string,
            xCenter: number,
            yBaseline: number,
            targetInnerWidth: number,
            startSize: number,
            minSize = 7,
            color = rgb(0, 0.45, 0.35)
        ) {
            if (!text) return { usedSize: 0, usedWidth: 0 };

            let size = startSize;
            let width = maxTextWidth(text, size);

            while (width > targetInnerWidth && size > minSize) {
                size -= 0.5;
                width = maxTextWidth(text, size);
            }

            let finalText = text;
            if (width > targetInnerWidth) {
                // ellipsis por busca binária
                let lo = 0;
                let hi = text.length;
                while (lo < hi) {
                    const mid = Math.floor((lo + hi + 1) / 2);
                    const snippet = text.slice(0, mid) + "…";
                    if (font.widthOfTextAtSize(snippet, size) <= targetInnerWidth) {
                        lo = mid;
                    } else {
                        hi = mid - 1;
                    }
                }
                finalText = text.slice(0, lo) + "…";
                width = font.widthOfTextAtSize(finalText, size);
            }

            const textX = xCenter - width / 2;
            page.drawText(finalText, {
                x: textX,
                y: yBaseline,
                size,
                font,
                color,
            });

            return { usedSize: size, usedWidth: width };
        }

        // Desenha cartões
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * (cardSize + gutter);
                const y = startY - r * (cardSize + gutter);

                // Moldura
                page.drawRectangle({
                    x,
                    y,
                    width: cardSize,
                    height: cardSize,
                    borderColor: rgb(0.82, 0.91, 0.86), // verde clarinho
                    borderWidth: 1,
                    color: rgb(1, 1, 1),
                });

                const innerWidth = cardSize - padding * 2;
                const centerX = x + cardSize / 2;

                if (title) {
                    const top = y + cardSize - padding;
                    const baseline = top - titleSize;
                    drawFittedSingleLine(
                        title,
                        centerX,
                        baseline,
                        innerWidth,
                        titleSize,
                        7,
                        rgb(0.0, 0.45, 0.35)
                    );
                }

                const available = innerHeight();
                const qrW = Math.min(available, qrImage.width);
                const qrH = Math.min(available, qrImage.height);
                const qrSide = Math.min(qrW, qrH);
                const qrX = x + (cardSize - qrSide) / 2;
                const qrY = innerBottomY(y) + (available - qrSide) / 2;

                page.drawImage(qrImage, {
                    x: qrX,
                    y: qrY,
                    width: qrSide,
                    height: qrSide,
                });

                if (footer) {
                    const baseline = y + padding; // perto da base
                    drawFittedSingleLine(
                        footer,
                        centerX,
                        baseline,
                        innerWidth,
                        footerSize || 8,
                        6,
                        rgb(0.25, 0.25, 0.25)
                    );
                }
            }
        }

        const bytes = await pdf.save();
        const ab = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(ab).set(bytes);

        return new NextResponse(ab, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename=album-${id}-qrcards.pdf`,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (err: any) {
        console.error("QR Cards PDF error:", err);
        return NextResponse.json({ error: "Falha ao gerar PDF" }, { status: 500 });
    }
}
