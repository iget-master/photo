'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginClient({
                                        callbackUrl,
                                        registered,
                                        errorParam,
                                    }: {
    callbackUrl: string
    registered: boolean
    errorParam: string | null
}) {
    const router = useRouter()
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (loading) return
        setLoading(true)
        setError(null)

        const res = await signIn('credentials', {
            redirect: false,
            email,
            password,
            callbackUrl,
        })

        setLoading(false)

        if (!res || res.error) {
            setError('E-mail ou senha inválidos.')
            return
        }

        // res.url pode ser undefined — volta para o callbackUrl seguro
        router.push(res.url ?? callbackUrl)
    }

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center p-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">Entrar</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Acesse com seu e-mail e senha.
                        {registered && (
                            <span className="text-green-600"> Conta criada! Faça login.</span>
                        )}
                        {errorParam && (
                            <span className="ml-2 text-red-600">Falha ao autenticar.</span>
                        )}
                    </p>
                </CardHeader>

                <form onSubmit={onSubmit} autoComplete="on">
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">E-mail</Label>
                            <Input
                                id="login-email"
                                name="username"                // ajuda alguns password managers
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="username"        // hint de login
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="login-password">Senha</Label>
                            <Input
                                id="login-password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                            />
                        </div>

                        {(error || errorParam) && (
                            <p className="text-sm text-red-600">
                                {error ?? 'Falha ao autenticar.'}
                            </p>
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => router.push('/register')}
                        >
                            Criar conta
                        </Button>

                        <Button type="submit" disabled={loading}>
                            {loading ? 'Entrando…' : 'Entrar'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
