"use client"

import { RefreshCw, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"

// O servidor não respondeu, e a sessão continua aberta (SESSAO-12)
export function AvisoDeConexao({ onTentarDeNovo }: { onTentarDeNovo: () => void }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <div
        role="alert"
        className="max-w-md w-full p-8 rounded-[32px] bg-card border border-border/40 shadow-xl shadow-primary/5 text-center"
      >
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <WifiOff className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-foreground mb-3">
          Não conseguimos falar com o servidor.
        </h2>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed mb-8">
          Sua sessão continua aberta. Verifique sua conexão e tente de novo em alguns instantes.
        </p>
        <Button onClick={onTentarDeNovo} className="h-12 px-6 rounded-2xl font-bold">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}
