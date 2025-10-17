import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Camera,
    Bolt,
    Wallet,
    ScanFace as Face,
    CheckCircle2,
    Shield,
    Sparkles,
    Clock,
    Rocket,
    QrCode,
    ChevronRight,
    ArrowRight,
    Medal, LogIn
} from "lucide-react";

export const metadata = {
    title: "Photo — Venda de fotos de eventos em minutos",
    description:
        "Cadastre-se grátis, publique seu álbum e venda em minutos. Reconhecimento facial, cobrança automática, repasse imediato via Pix. Ideal para eventos esportivos.",
};

function Container({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
    return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function Badge({ children }: React.PropsWithChildren) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
      <Medal className="size-3.5" aria-hidden /> {children}
    </span>
    );
}

function Btn({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
    const base =
        "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";
    const styles =
        variant === "primary"
            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            : "bg-transparent text-emerald-700 hover:bg-emerald-600/10";
    return (
        <Link href={href} className={`${base} ${styles}`}>
            {children}
        </Link>
    );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
    return (
        <div className="mx-auto mb-8 max-w-3xl text-center">
            {eyebrow && <Badge>{eyebrow}</Badge>}
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
            {subtitle && <p className="mt-3 text-pretty text-base text-muted-foreground">{subtitle}</p>}
        </div>
    );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<any>; title: string; desc: string }) {
    return (
        <div className="group rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50">
                <Icon className="size-6 text-emerald-700" aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
        </div>
    );
}

function ChecklistItem({ children }: React.PropsWithChildren) {
    return (
        <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
            <span className="text-sm text-muted-foreground">{children}</span>
        </li>
    );
}

export default function MarketingPage() {
    return (
        <main className="bg-gradient-to-b from-white to-emerald-50/40">
            {/* NAV */}
            <nav className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                <Container className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <Camera className="size-5" aria-hidden />
                        </div>
                        <span className="text-base font-bold">Photo</span>
                    </Link>
                    <div className="hidden items-center gap-3 sm:flex">
                        <Link href="#recursos" className="text-sm text-muted-foreground hover:text-foreground">Recursos</Link>
                        <Link href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground">Como funciona</Link>
                        <Link href="#preco" className="text-sm text-muted-foreground hover:text-foreground">Preço</Link>
                        <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Btn href="/login" variant="ghost">Entrar</Btn>
                        <Btn href="/signup">
                            Comece grátis <ArrowRight className="size-4" aria-hidden />
                        </Btn>
                    </div>
                </Container>
            </nav>

            {/* HERO */}
            <section className="relative overflow-hidden">
                <Container className="grid items-center gap-10 py-14 sm:grid-cols-2 sm:py-20">
                    <div>
                        <Badge>feito para fotógrafos esportivos</Badge>
                        <h1 className="mt-4 text-balance text-4xl font-black tracking-tight sm:text-5xl">
                            Venda fotos em minutos. Receba na hora via Pix.
                        </h1>
                        <p className="mt-4 text-pretty text-base text-muted-foreground">
                            Cadastre-se grátis, crie um álbum do seu evento e compartilhe o link. O cliente encontra suas próprias fotos com reconhecimento facial e paga em poucos toques.
                        </p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <Btn href="/signup">
                                Comece agora — é grátis
                                <Rocket className="size-4" aria-hidden />
                            </Btn>
                        </div>
                        <ul className="mt-6 grid gap-2">
                            <ChecklistItem>Cadastro simples em menos de 1 minuto.</ChecklistItem>
                            <ChecklistItem>Você só paga quando vender (taxa por venda).</ChecklistItem>
                            <ChecklistItem>Repasse instantâneo via Pix após cada compra.</ChecklistItem>
                            <ChecklistItem>Imprima o cartão QRCode e entregue para os clientes.</ChecklistItem>
                        </ul>
                    </div>
                    <div aria-hidden className="relative">
                        <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-xl">
                            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-xl bg-emerald-600" />
                                        <div>
                                            <div className="h-3 w-20 rounded bg-black/10" />
                                            <div className="mt-1 h-2 w-12 rounded bg-black/10" />
                                        </div>
                                    </div>
                                    <div className="h-6 w-20 rounded-full bg-black/10" />
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-3">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="aspect-square overflow-hidden rounded-xl border border-black/5 bg-white">
                                            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(16,185,129,0.15)_0%,rgba(16,185,129,0.05)_100%)]" />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-lg bg-emerald-600/10" />
                                        <div>
                                            <div className="h-3 w-24 rounded bg-black/10" />
                                            <div className="mt-1 h-2 w-16 rounded bg-black/10" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-16 rounded-lg bg-emerald-600/90" />
                                        <div className="h-8 w-8 rounded-lg bg-emerald-600/20" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pointer-events-none absolute -right-8 -top-8 hidden rotate-6 rounded-2xl border border-emerald-200 bg-white/80 p-3 shadow-sm sm:block">
                            <div className="flex items-center gap-2 text-xs">
                                <QrCode className="size-4" /> QR do álbum pronto para imprimir
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* FEATURES */}
            <section id="recursos" className="py-16 sm:py-24">
                <Container>
                    <SectionHeading
                        eyebrow="recursos"
                        title="Feito para quem vive de fotografar eventos"
                        subtitle="Ferramentas que reduzem seu trabalho e aumentam suas vendas."
                    />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <FeatureCard icon={LogIn} title="Cadastro grátis e rápido" desc="Sem burocracia: e-mail, senha e pronto. Comece testando sem custo." />
                        <FeatureCard icon={Wallet} title="Receba na hora via Pix" desc="Repasse imediato a cada compra." />
                        <FeatureCard icon={Face} title="Reconhecimento facial" desc="Cliente encontra as próprias fotos em segundos. Ideal para eventos esportivos." />
                        <FeatureCard icon={Shield} title="Marcas d’água e controle" desc="Evite uso indesejado de suas fotos. Download só após pagamento." />
                    </div>
                </Container>
            </section>

            {/* HOW IT WORKS */}
            <section id="como-funciona" className="border-y border-black/5 bg-white py-16 sm:py-24">
                <Container>
                    <SectionHeading
                        eyebrow="Venda em 3 passos"
                        title="Do upload à venda em 3 passos"
                        subtitle="Pensado para o ritmo acelerado de eventos esportivos."
                    />
                    <ol className="grid gap-6 sm:grid-cols-3">
                        <li className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-sm font-semibold">
                                <span className="grid size-7 place-content-center rounded-full bg-emerald-600/10 text-emerald-700">1</span>
                                Crie seu álbum
                            </div>
                            <p className="mt-2 text-md text-muted-foreground">Venda antes mesmo de fotografar!</p>
                            <p className="mt-2 text-md text-muted-foreground">Crie seu album e imprima seu <strong>Cartão QRCode</strong> para entregar no evento.</p>
                        </li>
                        <li className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-sm font-semibold">
                                <span className="grid size-7 place-content-center rounded-full bg-emerald-600/10 text-emerald-700">2</span>
                                Fotografe seus atletas
                            </div>
                            <p className="mt-2 text-md text-muted-foreground">Fotografar é com você!</p>
                            <p className="mt-2 text-md text-muted-foreground">Envie suas fotos no album rapidinho e comece a vender! </p>
                        </li>
                        <li className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-sm font-semibold">
                                <span className="grid size-7 place-content-center rounded-full bg-emerald-600/10 text-emerald-700">3</span>
                                Venda e receba na hora
                            </div>
                            <p className="mt-2 text-md text-muted-foreground">Pagamento instantâneo via Pix.</p>
                            <p className="mt-2 text-md text-muted-foreground">Seu atleta irá selecionar as melhores fotos com ajuda do reconhecimento facial, pagar no PIX, e você recebere na hora!</p>
                        </li>
                    </ol>
                </Container>
            </section>

            {/* PRICING */}
            <section id="preco" className="py-16 sm:py-24">
                <Container>
                    <SectionHeading
                        eyebrow="preço simples"
                        title="Cadastre-se grátis. Você só paga quando vender."
                        subtitle="Sem mensalidade, sem planos!"
                    />
                    <div className="mx-auto max-w-4xl rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
                        <div className="grid items-center gap-8 sm:grid-cols-[1.3fr_1fr]">
                            <div>
                                <h3 className="text-xl font-bold">Plano Único</h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Taxa por venda que cobre processamento de pagamento, hospedagem e entrega das fotos. Sem taxas escondidas.
                                </p>
                                <ul className="mt-6 grid gap-2">
                                    <ChecklistItem>Cadastro gratuito e ilimitado</ChecklistItem>
                                    <ChecklistItem>Reconhecimento facial incluso</ChecklistItem>
                                    <ChecklistItem>QR do álbum e links compartilháveis</ChecklistItem>
                                    <ChecklistItem>Recebimento imediato via Pix</ChecklistItem>
                                    <ChecklistItem>Marca d’água e segurança</ChecklistItem>
                                </ul>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                                <div className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Você no controle</div>
                                <div className="mt-2 text-4xl font-black">10%</div>
                                <div className="text-sm text-muted-foreground mb-2">do valor vendido</div>
                                <Btn href="/signup">
                                    Começar grátis <ArrowRight className="size-4" />
                                </Btn>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* DEMO / CTA */}
            <section id="demo" className="border-y border-black/5 bg-emerald-600 py-16 text-white sm:py-20">
                <Container className="grid items-center gap-10 sm:grid-cols-2">
                    <div>
                        <h3 className="text-3xl font-bold">Experimente agora, sem compromisso</h3>
                        <p className="mt-3 text-white/80">
                            Gere um álbum de teste, escaneie o QR e veja como os clientes encontram as próprias fotos por reconhecimento facial.
                        </p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-emerald-700 hover:bg-white/90">
                                Criar álbum de teste <Rocket className="size-4" />
                            </Link>
                            <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-500/90">
                                Entrar
                            </Link>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/20 bg-white/5 p-4">
                            <div className="aspect-square w-full rounded-2xl bg-gradient-to-br from-emerald-400/30 to-white/10" />
                        </div>
                        <div className="pointer-events-none absolute -bottom-3 -right-3 rounded-xl bg-white/10 px-3 py-2 text-xs backdrop-blur">
                            QR para clientes encontrarem suas fotos
                        </div>
                    </div>
                </Container>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-16 sm:py-24">
                <Container>
                    <SectionHeading eyebrow="faq" title="Perguntas frequentes" />
                    <div className="mx-auto grid max-w-4xl gap-4">
                        {[
                            {
                                q: "Preciso pagar algo para começar?",
                                a: "Não. O cadastro é gratuito e você só paga uma taxa quando vende uma foto.",
                            },
                            {
                                q: "Como funciona o reconhecimento facial?",
                                a: "O cliente envia uma selfie ou seleciona uma referência e o sistema sugere fotos semelhantes do evento.",
                            },
                            {
                                q: "O dinheiro cai quando?",
                                a: "O repasse é imediato via Pix após a confirmação do pagamento.",
                            },
                            {
                                q: "Posso usar marca d’água?",
                                a: "Sim. Você define a marca d’água padrão e só libera a foto limpa após o pagamento.",
                            },
                            {
                                q: "É ideal para quais eventos?",
                                a: "Feito para eventos esportivos (corridas, trilhas, trackdays), mas funciona bem em formaturas, balés e muito mais.",
                            },
                        ].map((item, i) => (
                            <details key={i} className="rounded-2xl border border-black/5 bg-white p-5 open:shadow-sm">
                                <summary className="cursor-pointer list-none text-base font-semibold">
                                    {item.q}
                                </summary>
                                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </Container>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-black/5 bg-white py-10">
                <Container className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <Camera className="size-5" aria-hidden />
                        </div>
                        <span className="text-sm font-semibold">Photo</span>
                    </div>
                    <p className="text-center text-xs text-muted-foreground sm:text-right">
                        © {new Date().getFullYear()} Photo. Todos os direitos reservados.
                    </p>
                </Container>
            </footer>
        </main>
    );
}

// Tailwind utility aliases used:
// - text-muted-foreground relies on your Tailwind config. Caso não exista, adicione no globals.css:
//   .text-muted-foreground { color: rgb(107 114 128); }
