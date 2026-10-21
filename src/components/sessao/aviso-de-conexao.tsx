"use client"

import { RefreshCw, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"

// O servidor não respondeu, e a sessão continua aberta (SESSAO-12)
export function AvisoDeConexao({ onTentarDeNovo }: { onTentarDeNovo: () => void }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <div
        role="alert"
        className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center"
      >
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-elevated text-warn">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="display-m mb-3">
          Não conseguimos falar com o servidor.
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Sua sessão continua aberta. Verifique sua conexão e tente de novo em alguns instantes.
        </p>
        <Button onClick={onTentarDeNovo}>
          <RefreshCw aria-hidden="true" />
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}
