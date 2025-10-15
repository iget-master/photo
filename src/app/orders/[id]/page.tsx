import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getDownloadUrl } from '@vercel/blob'
import { Download } from 'lucide-react'

function formatBRL(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCPF(cpf?: string | null) {
    if (!cpf) return '—'
    const digits = cpf.replace(/\D/g, '').slice(0, 11)
    if (digits.length < 11) return '—'
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

type PageProps = { params: Promise<{ id: string }> }

export default async function OrderPage({ params }: PageProps) {
    const { id } = await params

    const order = await prisma.order.findUnique({
        where: { id },
        select: {
            id: true,
            status: true,
            totalCents: true,
            paymentMethod: true,
            customerEmail: true,
            customerCpf: true,
            items: {
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    unitPriceCents: true,
                    photo: {
                        select: {
                            id: true,
                            originalName: true,
                            url: true,
                            urlThumb: true,
                        },
                    },
                },
            },
        },
    })

    if (!order) return notFound()
    // 🔒 Só acessível se o pedido estiver pago
    if (order.status !== 'PAID') return notFound()

    type P = NonNullable<(typeof order.items)[number]['photo']>
    const basePhotos = order.items
        .map((it) => it.photo)
        .filter((p): p is P => Boolean(p?.id && p?.url))

    // Gera URL de download (assinada) para cada foto
    const photos = await Promise.all(
        basePhotos.map(async (p) => ({
            ...p,
            downloadUrl: await getDownloadUrl(p.url),
        }))
    )

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <header className="mb-6 flex items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Pedido #{order.id}</h1>
                <a
                    href={`/order/${order.id}/download`}
                    className="inline-flex items-center gap-2 rounded-lg border bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Download className="h-4 w-4" aria-hidden />
                    Salvar tudo
                </a>
            </header>

            <section className="mb-8">
                <div className="rounded-xl border p-4">
                    <h2 className="mb-3 text-lg font-medium">Resumo</h2>
                    <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
                        <div className="flex justify-between sm:justify-start sm:gap-3">
                            <dt className="text-gray-600">Valor total</dt>
                            <dd className="font-medium">{formatBRL(order.totalCents)}</dd>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-3">
                            <dt className="text-gray-600">Forma de pagamento</dt>
                            <dd className="font-medium">{order.paymentMethod}</dd>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-3">
                            <dt className="text-gray-600">E-mail</dt>
                            <dd className="font-medium">{order.customerEmail ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-3">
                            <dt className="text-gray-600">CPF</dt>
                            <dd className="font-medium">{formatCPF(order.customerCpf)}</dd>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-3">
                            <dt className="text-gray-600">Fotos compradas</dt>
                            <dd className="font-medium">{photos.length}</dd>
                        </div>
                    </dl>
                </div>
            </section>

            <section>
                <h2 className="mb-4 text-lg font-medium">Fotos ({photos.length})</h2>
                {photos.length === 0 ? (
                    <p className="text-sm text-gray-600">Nenhuma foto encontrada neste pedido.</p>
                ) : (
                    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {photos.map((p) => (
                            <li key={p.id} className="group overflow-hidden rounded-xl border">
                                <a href={p.url} target="_blank" rel="noreferrer">
                                    {/* clicar na imagem abre em nova aba */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={p.urlThumb ?? p.url}
                                        alt={`Foto ${p.id}`}
                                        className="h-44 w-full object-cover transition group-hover:opacity-90"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </a>
                                <div className="flex items-center justify-end gap-2 border-t p-2">
                                    <a
                                        href={`/photo/${p.id}/download`}
                                        download
                                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50"
                                    >
                                        <Download className="h-3.5 w-3.5" aria-hidden />
                                        Salvar
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
