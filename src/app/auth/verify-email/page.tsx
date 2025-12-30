"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "@/services/apiClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      setStatus("error")
      return
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email/?token=${token}`)
        setStatus("success")
      } catch (error) {
        console.error(error)
        setStatus("error")
      }
    }

    verify()
  }, [token])

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <CardTitle>Verificação de E-mail</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando seu e-mail...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-medium">E-mail verificado com sucesso!</p>
            <p className="text-sm text-muted-foreground">Sua conta está ativa e pronta para uso.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="font-medium">Falha na verificação</p>
            <p className="text-sm text-muted-foreground">O link pode ser inválido ou ter expirado.</p>
          </>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        {status !== "loading" && (
           <Link href="/auth/login" className="w-full">
             <Button className="w-full">Ir para Login</Button>
           </Link>
        )}
      </CardFooter>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
       <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
         <VerifyEmailContent />
       </Suspense>
    </div>
  )
}
