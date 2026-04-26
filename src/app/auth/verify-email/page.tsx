"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "@/services/apiClient"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

import { useAuth } from "@/contexts/auth-context"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { login } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [tokens, setTokens] = useState<{access: string, refresh: string} | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      return
    }

    const verify = async () => {
      try {
        const response = await api.get(`/auth/verify-email/?token=${token}`)
        setTokens({
          access: response.data.access,
          refresh: response.data.refresh
        })
        setStatus("success")
      } catch (error) {
        console.error(error)
        setStatus("error")
      }
    }

    verify()
  }, [token])

  const handleAccessAccount = async () => {
    if (tokens) {
      await login(tokens.access, tokens.refresh)
    }
  }

  return (
    <AuthShell 
      title="Verificação de Conta" 
      description={status === "loading" ? "Validando suas credenciais..." : "Processamento finalizado."}
    >
      <div className="flex flex-col items-center justify-center space-y-8 py-4">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-[28px] bg-primary/5 flex items-center justify-center border border-primary/10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-2 border-2 border-dashed border-primary/20 rounded-[32px]"
                />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Autenticando...</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex flex-col items-center space-y-6 w-full"
            >
              <div className="w-20 h-20 rounded-[28px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner relative overflow-hidden">
                <CheckCircle2 className="h-10 w-10 relative z-10" />
                <motion.div 
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-emerald-500/20 rounded-full"
                />
              </div>
              <div className="text-center space-y-2 px-4">
                <h3 className="text-xl font-black tracking-tight">Tudo pronto!</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Seu e-mail foi validado e sua conta está **totalmente ativa** no Fluxar.</p>
              </div>
              <Button 
                onClick={handleAccessAccount} 
                className="w-full h-14 rounded-full text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 group transition-all hover:scale-[1.02]"
              >
                <span className="flex items-center gap-2">
                  Acessar Minha Conta
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex flex-col items-center space-y-6 w-full"
            >
              <div className="w-20 h-20 rounded-[28px] bg-destructive/10 flex items-center justify-center text-destructive">
                <XCircle className="h-10 w-10" />
              </div>
              <div className="text-center space-y-2 px-4">
                <h3 className="text-xl font-black tracking-tight text-destructive">Falha na Verificação</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Este link de verificação é inválido ou expirou. Tente solicitar um novo acesso.</p>
              </div>
              <Button asChild variant="outline" className="w-full h-12 rounded-2xl border-border/60 font-bold transition-all hover:bg-muted">
                <Link href="/auth/login">Voltar para o Login</Link>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
     <Suspense fallback={
       <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     }>
        <VerifyEmailContent />
     </Suspense>
  )
}

