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
    <Card className="w-full max-w-md rounded-[32px] border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
      <CardHeader className="pt-8 px-8 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">Verificação de E-mail</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-8 space-y-6">
        {status === "loading" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Verificando seu e-mail...</p>
          </div>
        )}
        {status === "success" && (
          <div className="flex flex-col items-center space-y-4 animate-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 rounded-3xl bg-green-500/10 flex items-center justify-center border border-green-200 dark:border-green-900/50 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-foreground">E-mail verificado!</p>
              <p className="text-sm text-muted-foreground leading-relaxed">Sua conta está ativa e pronta para uso no Fluxar.</p>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center space-y-4 animate-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 rounded-3xl bg-destructive/10 flex items-center justify-center border border-destructive/20 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-foreground">Falha na verificação</p>
              <p className="text-sm text-muted-foreground leading-relaxed">O link pode ser inválido ou ter expirado. Tente solicitar um novo link.</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-8 pt-0">
        {status !== "loading" && (
           <Link href="/auth/login" className="w-full">
             <Button className="w-full h-12 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
               Ir para Login
             </Button>
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
