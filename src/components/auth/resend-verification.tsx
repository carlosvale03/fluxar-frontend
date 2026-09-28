"use client"

import { useState } from "react"
import { toast } from "sonner"
import { MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { api, mensagemDeErro } from "@/services/apiClient"

interface ResendVerificationProps {
  email: string
  className?: string
}

type Retorno = { tipo: "sucesso" | "erro"; texto: string }

// Reenvio do e-mail de verificação (AUTH-10, AUTH-11). Mostra a resposta
// neutra do backend ou a mensagem do erro, inclusive a do 429 (AUTH-36).
export function ResendVerification({ email, className }: ResendVerificationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [retorno, setRetorno] = useState<Retorno | null>(null)

  const reenviar = async () => {
    try {
      setIsLoading(true)
      const response = await api.post("/auth/resend-verification/", { email })
      setRetorno({ tipo: "sucesso", texto: response.data.message })
      toast.success(response.data.message)
    } catch (error) {
      const texto = mensagemDeErro(error, "Não foi possível reenviar o e-mail. Tente novamente.")
      setRetorno({ tipo: "erro", texto })
      toast.error(texto)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("space-y-2 w-full", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={reenviar}
        loading={isLoading}
        disabled={isLoading || !email}
        className="w-full h-12 rounded-2xl border-border/60 font-bold transition-all hover:bg-muted"
      >
        <MailCheck className="h-4 w-4" />
        Reenviar e-mail
      </Button>
      {retorno && (
        <p
          role={retorno.tipo === "erro" ? "alert" : "status"}
          className={cn(
            "text-xs font-medium text-center leading-relaxed",
            retorno.tipo === "erro" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {retorno.texto}
        </p>
      )}
    </div>
  )
}
