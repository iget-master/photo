import LoginClient from './login-client'

type SP = Record<string, string | string[] | undefined>

export default async function Page(
    { searchParams }: { searchParams: Promise<SP> | SP }
) {
    const sp = await searchParams

    const callbackUrl = (sp?.callbackUrl as string) ?? '/albums'
    const registered = sp?.registered === '1'
    const errorParam = (sp?.error as string) ?? null

    return (
        <LoginClient
            callbackUrl={callbackUrl}
            registered={registered}
            errorParam={errorParam}
        />
    )
}
