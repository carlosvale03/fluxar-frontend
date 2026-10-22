"use client"

import { AlertCircle, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ROTULO_TENTAR_DE_NOVO } from "@/lib/erros"

// AZ-42: falha inesperada numa tela do app; o resto da casca continua de pé
export default function ErroDaTela({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-10">
      <div role="alert" className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-elevated text-outflow">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="display-m mb-2">Não foi possível abrir esta tela</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Seus dados continuam salvos. Tente de novo; se o problema continuar, volte para a Ponte de Comando.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RotateCw aria-hidden="true" /> {ROTULO_TENTAR_DE_NOVO}
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">Ir para a Ponte de Comando</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
