import * as React from 'react'
import { Html, Head, Preview, Body, Container, Heading, Text, Link, Img, Section } from '@react-email/components'
import {absoluteUrl} from "@/lib/url";

type Props = {
    order: {
        id: string,
        customerEmail: string | null,
        totalCents: number,
        paymentMethod: string,
        album: {
            id: string,
            albumName: string,
            photographer: {
                name: string | null
            }
        }
        _count: {
            items: number
        }
    }
}

export default function OrderReady({ order }: Props) {

    const link = absoluteUrl(`/order/${order.id}`);

    return (
        <Html lang="pt-BR">
            <Head />
            <Preview>Aqui estão suas fotos</Preview>
            <Body style={{ backgroundColor: '#f4f6f8', margin: 0 }}>
                <Container style={{ maxWidth: 600, margin: '24px auto', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
                    <Section style={{ background: '#0b1324', textAlign: 'center', padding: 20 }}>
                        <Img src="https://via.placeholder.com/140x40?text=LOGO" width="140" height="40" alt="Photo" />
                    </Section>

                    <Section style={{ padding: '20px 24px 8px 24px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                        <Heading as="h1" style={{ margin: 0, fontSize: 22, color: '#0b1324' }}>Aqui estão suas fotos</Heading>
                    </Section>

                    <Section style={{ padding: '8px 24px 0 24px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#1f2937', fontSize: 15, lineHeight: '22px' }}>
                        <Text>
                            Olá, recebemos seu pagamento via <b>PIX</b> no valor de <b>{order.totalCents}</b> referente à compra de <b>{order._count.items}</b> fotos
                            do álbum <b>{order.album.albumName}</b> do fotógrafo <b>{order.album.photographer.name}</b>.
                        </Text>
                        <Text>Para visualizar e baixar suas fotos em alta resolução, clique abaixo:</Text>
                    </Section>

                    <Section style={{ textAlign: 'center', padding: '4px 24px 22px 24px' }}>
                        <Link
                            href={link}
                            target="_blank"
                            style={{ display: 'inline-block', padding: '12px 22px', background: '#2563eb', color: '#fff', borderRadius: 8, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 15 }}
                        >
                            Ver minhas fotos
                        </Link>
                        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 8, wordBreak: 'break-all' }}>
                            Se o botão não funcionar, copie e cole este link: <Link href={link} style={{ color: '#2563eb' }}>{link}</Link>
                        </Text>
                    </Section>

                    <Section style={{ padding: '0 24px' }}>
                        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: 0 }} />
                    </Section>

                    <Section style={{ padding: '18px 24px 24px 24px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#4b5563', fontSize: 13, lineHeight: '20px' }}>
                        <Text style={{ margin: 0 }}>
                            Agradecemos sua compra,<br /><b>Equipe Photo</b>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}