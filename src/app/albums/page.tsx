import Image from 'next/image'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SortBar from './sort-bar'
import { Link as LinkIcon, Receipt, Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const safeNumber = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0)
function conversionRate(sold: unknown, total: unknown) {
    const s = safeNumber(sold)
    const t = safeNumber(total)
    if (!t) return '—'
    const pct = (s / t) * 100
    return pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
}

type Row = {
    id: string
    albumName: string
    coverPhotoUrl: string | null
    photoCount: number
    visitCount: number
    soldPhotos: number
    totalSoldValueCents: number
    pricePerPhotoCents: number
    updatedAt: Date
}

type SortBy = 'name' | 'photos' | 'visits' | 'sold' | 'conversion' | 'revenue'
type SortDir = 'asc' | 'desc'

function coerceSortBy(v?: string): SortBy {
    const allowed: SortBy[] = ['name', 'photos', 'visits', 'sold', 'conversion', 'revenue']
    return allowed.includes(v as SortBy) ? (v as SortBy) : 'revenue'
}
function coerceSortDir(v?: string): SortDir {
    return v === 'asc' || v === 'desc' ? v : 'desc'
}

async function getAlbumsFor(userId: string): Promise<Row[]> {
    const rows = await prisma.album.findMany({
        where: { photographerId: userId },
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { photos: { where: { deletedAt: null }} } } },
    })

    return rows.map((a) => {
        const photos = a._count.photos || 0
        return {
            id: a.id,
            albumName: a.albumName,
            coverPhotoUrl: a.coverPhotoUrl ?? null,
            photoCount: photos,
            visitCount: a.visitCount,
            soldPhotos: a.soldPhotos,
            totalSoldValueCents: a.totalSoldValueCents,
            pricePerPhotoCents: a.pricePerPhotoCents ?? 0,
            updatedAt: a.updatedAt,
        }
    })
}

function sortRows(rows: Row[], sortBy: SortBy, sortDir: SortDir) {
    const dir = sortDir === 'asc' ? 1 : -1
    const arr = [...rows]
    arr.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return dir * a.albumName.localeCompare(b.albumName, 'pt-BR')
            case 'photos':
                return dir * (a.photoCount - b.photoCount)
            case 'visits':
                return dir * (a.visitCount - b.visitCount)
            case 'sold':
                return dir * (a.soldPhotos - b.soldPhotos)
            case 'revenue':
                return dir * (a.totalSoldValueCents - b.totalSoldValueCents)
            case 'conversion': {
                const convA = a.photoCount ? a.soldPhotos / a.photoCount : 0
                const convB = b.photoCount ? b.soldPhotos / b.photoCount : 0
                return dir * (convA - convB)
            }
            default:
                return 0
        }
    })
    return arr
}

export default async function AlbumsPage({
                                             searchParams,
                                         }: {
    // Next 15+: searchParams é assíncrono
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) redirect('/login')

    const sp = await searchParams
    const sortBy = coerceSortBy(Array.isArray(sp.sortBy) ? sp.sortBy[0] : sp.sortBy)
    const sortDir = coerceSortDir(Array.isArray(sp.sortDir) ? sp.sortDir[0] : sp.sortDir)

    const rows = await getAlbumsFor((session.user as any).id)
    const sorted = sortRows(rows, sortBy, sortDir)

    const totals = {
        photos: rows.reduce((acc, r) => acc + r.photoCount, 0),
        visits: rows.reduce((acc, r) => acc + r.visitCount, 0),
        sold: rows.reduce((acc, r) => acc + r.soldPhotos, 0),
        revenue: rows.reduce((acc, r) => acc + r.totalSoldValueCents, 0) / 100,
    }

    return (
        <div className="mx-auto max-w-6xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">Meus Álbuns</h1>
                <div className="flex items-center gap-2">
                    <SortBar sortBy={sortBy} sortDir={sortDir} />
                    <Button asChild>
                        <Link href="/albums/new/edit">+ Novo Álbum</Link>
                    </Button>
                </div>
            </div>

            {/* totalizadores */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total de Fotos</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {totals.photos.toLocaleString('pt-BR')}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Visitas</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {totals.visits.toLocaleString('pt-BR')}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Fotos Vendidas</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {totals.sold.toLocaleString('pt-BR')}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {brl.format(totals.revenue)}
                    </CardContent>
                </Card>
            </div>

            {/* tabela */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-lg">Álbuns</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[42%]">Álbum</TableHead>
                                <TableHead className="text-right">Fotos</TableHead>
                                <TableHead className="text-right">Visitas</TableHead>
                                <TableHead className="text-right">Fotos vendidas</TableHead>
                                <TableHead className="text-right">Faturamento</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.map((album) => {
                                const photos = album.photoCount
                                const visits = album.visitCount
                                const sold = album.soldPhotos
                                const revenue = album.totalSoldValueCents / 100
                                return (
                                    <TableRow key={album.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="relative h-12 w-20 overflow-hidden rounded-md border bg-muted">
                                                    {album.coverPhotoUrl ? (
                                                        <Image
                                                            src={album.coverPhotoUrl}
                                                            alt={`Capa de ${album.albumName}`}
                                                            fill
                                                            sizes="80px"
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                                            sem capa
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium">{album.albumName}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Atualizado em {album.updatedAt.toLocaleDateString('pt-BR')}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{photos.toLocaleString('pt-BR')}</TableCell>
                                        <TableCell className="text-right">{visits.toLocaleString('pt-BR')}</TableCell>
                                        <TableCell className="text-right">{sold.toLocaleString('pt-BR')} ({conversionRate(sold, photos)})</TableCell>
                                        <TableCell className="text-right">{brl.format(revenue)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Ver página pública */}
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                    className="hover:bg-transparent"
                                                    aria-label="Abrir página pública"
                                                    title="Abrir página pública"
                                                >
                                                    <Link href={`/public/album/${album.id}`}>
                                                        <LinkIcon className="h-5 w-5" />
                                                    </Link>
                                                </Button>

                                                {/* Pedidos do álbum */}
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                    className="hover:bg-transparent"
                                                    aria-label="Ver pedidos"
                                                    title="Ver pedidos"
                                                >
                                                    <Link href={`/albums/${album.id}/orders`}>
                                                        <Receipt className="h-5 w-5" />
                                                    </Link>
                                                </Button>

                                                {/* Editar álbum */}
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                    className="hover:bg-transparent"
                                                    aria-label="Editar álbum"
                                                    title="Editar álbum"
                                                >
                                                    <Link href={`/albums/${album.id}/edit`}>
                                                        <Pencil className="h-5 w-5" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
