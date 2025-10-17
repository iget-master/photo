'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (loading) return
        setError(null)

        // validações client-side
        if (password.length < 8) {
            setError('A senha deve ter pelo menos 8 caracteres.')
            return
        }
        if (password !== confirm) {
            setError('As senhas não conferem.')
            return
        }

        try {
            setLoading(true)

            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, confirmPassword: confirm }),
            })

            const data = await res.json()
            if (!res.ok) {
                setLoading(false)
                setError(data?.error ?? 'Falha ao registrar.')
                return
            }

            const signin = await signIn('credentials', {
                redirect: false,
                email,
                password,
                callbackUrl: '/albums', // para onde levar após logar
            })

            setLoading(false)

            if (!signin || signin.error) {
                router.push('/login?registered=1')
                return
            }

            router.push(signin.url ?? '/albums')
        } catch (err) {
            console.error(err)
            setLoading(false)
            setError('Erro inesperado ao registrar. Tente novamente.')
        }
    }

    const disabled =
        loading ||
        !email ||
        !password ||
        !confirm ||
        password.length < 8 ||
        password !== confirm

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center p-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">Criar conta</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Crie sua conta grátis e comece a vender suas fotos!
                    </p>
                </CardHeader>

                <form onSubmit={onSubmit} autoComplete="on" noValidate>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reg-name">Nome</Label>
                            <Input
                                id="reg-name"
                                name="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="name"
                                placeholder="Seu nome"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reg-email">E-mail</Label>
                            <Input
                                id="reg-email"
                                name="username"            // ajuda password managers a reconhecer a conta
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="username"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                inputMode="email"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reg-password">Senha</Label>
                            <Input
                                id="reg-password"
                                name="new-password"        // importante para o Chrome sugerir senha
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder="mín. 8 caracteres"
                                aria-invalid={password !== '' && password.length < 8}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reg-password-confirm">Confirmar senha</Label>
                            <Input
                                id="reg-password-confirm"
                                name="new-password"        // manter "new-password" também aqui
                                type="password"
                                required
                                minLength={8}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                autoComplete="new-password"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder="repita a senha"
                                aria-invalid={confirm !== '' && confirm !== password}
                            />
                            {confirm && confirm !== password && (
                                <p className="text-xs text-red-600">As senhas não conferem.</p>
                            )}
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </CardContent>

                    <CardFooter className="flex justify-end mt-4">
                        <Button type="submit" disabled={disabled}>
                            {loading ? 'Criando e entrando…' : 'Criar conta'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
