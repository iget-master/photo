// components/QrCardsDialog.tsx
"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { QrCode, Download, X, Loader2 } from "lucide-react";

export function QrCardsDialog({
                                  albumId,
                                  defaultTitle = "Pegue aqui suas fotos!",
                                  defaultFooter = "",
                              }: {
    albumId: string;
    defaultTitle?: string;
    defaultFooter?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState(defaultTitle);
    const [footer, setFooter] = React.useState(defaultFooter);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    async function handleDownload() {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (title) params.set("title", title);
            if (footer) params.set("footer", footer);

            const res = await fetch(`/api/albums/${albumId}/qrcards?` + params.toString(), {
                method: "GET",
                cache: "no-store",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || `Erro ${res.status}`);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `album-${albumId}-qrcards.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            setOpen(false);
        } catch (e: any) {
            setError(e?.message || "Falha ao gerar PDF");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button
                    className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    aria-label="Gerar cartões QR"
                >
                    <QrCode className="size-4" aria-hidden />
                    QRCards
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0">
                    <div className="flex items-start justify-between gap-4">
                        <Dialog.Title className="text-lg font-semibold">Gerar cartões QR (A4)</Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="rounded-md p-1 text-muted-foreground hover:bg-black/5" aria-label="Fechar">
                                <X className="size-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="grid gap-1.5">
                            <label htmlFor="qr-title" className="text-sm font-medium">Título</label>
                            <input
                                id="qr-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Pegue aqui suas fotos!"
                                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring"
                            />
                            <p className="text-xs text-muted-foreground">Aparece no topo do cartão.</p>
                        </div>

                        <div className="grid gap-1.5">
                            <label htmlFor="qr-footer" className="text-sm font-medium">Rodapé (opcional)</label>
                            <input
                                id="qr-footer"
                                value={footer}
                                onChange={(e) => setFooter(e.target.value)}
                                placeholder="Ex.: Escaneie o QR para ver suas fotos"
                                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring"
                            />
                            <p className="text-xs text-muted-foreground">Fica na base do cartão.</p>
                        </div>

                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <Dialog.Close asChild>
                            <button className="rounded-lg px-3 py-2 text-sm hover:bg-black/5">Cancelar</button>
                        </Dialog.Close>
                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" aria-hidden />
                                    Gerando…
                                </>
                            ) : (
                                <>
                                    <Download className="size-4" aria-hidden />
                                    Baixar PDF
                                </>
                            )}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

// ---------------------------------------------------------------------------
// Exemplo de uso na página de lista de álbuns
// ---------------------------------------------------------------------------
// Em app/(dashboard)/albums/page.tsx (ou onde você lista os álbuns):
//
// "use client"; // se este arquivo renderiza a lista no cliente
// import { QrCardsDialog } from "@/components/QrCardsDialog";
//
// export default function AlbumsPage() {
//   const albums = [
//     { id: "abc123", name: "Corrida de Rua" },
//     { id: "def456", name: "Trackday" },
//   ];
//
//   return (
//     <div className="space-y-3">
//       {albums.map((album) => (
//         <div key={album.id} className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-4">
//           <div className="min-w-0">
//             <div className="truncate text-sm font-medium">{album.name}</div>
//             <div className="text-xs text-muted-foreground">ID: {album.id}</div>
//           </div>
//           <div className="flex items-center gap-2">
//             <QrCardsDialog albumId={album.id} />
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
