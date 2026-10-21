"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Lock, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePlan } from "@/hooks/use-plan"
import { cn } from "@/lib/utils"
import type { ChaveDeRecurso } from "@/types/planos"

export const MENSAGEM_RECURSO_BLOQUEADO = "Este recurso não está disponível no seu plano."

interface RecursoBloqueadoProps {
  chave: ChaveDeRecurso
  children: ReactNode
  // Nome do recurso no título do aviso
  titulo?: string
  // Aviso de uma linha, para o lugar de um botão ou de uma opção
  compacto?: boolean
  // Classes do aviso, para ocupar o lugar do conteúdo num grid
  className?: string
}

// PERM-19: com o recurso fechado, mostra o aviso do plano e o link para os
// planos no lugar do conteúdo; o conteúdo nem é montado, então as rotas dele
// não são chamadas. Sem o acesso carregado, não mostra nada até saber.
export function RecursoBloqueado({ chave, children, titulo, compacto = false, className }: RecursoBloqueadoProps) {
  const { podeUsar } = usePlan()
  const liberado = podeUsar(chave)

  if (liberado === null) return null
  if (liberado) return <>{children}</>

  return compacto ? <AvisoCompacto className={className} /> : <AvisoDoPlano titulo={titulo} className={className} />
}

export function AvisoCompacto({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-center gap-2 rounded-r-md border border-border border-l-[3px] border-l-warn bg-card px-3 py-2 text-sm text-fg-secondary",
        className,
      )}
    >
      <Lock className="h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
      <span>{MENSAGEM_RECURSO_BLOQUEADO}</span>
      <Link href="/planos" className="ml-auto font-semibold text-gold-line underline underline-offset-2">
        Ver planos
      </Link>
    </div>
  )
}

export function AvisoDoPlano({ titulo, className }: { titulo?: string; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex flex-col items-center justify-center space-y-5 rounded-lg border border-border bg-card p-10 text-center animate-in fade-in duration-base",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-elevated text-warn">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="display-m">{titulo ?? "Recurso do plano"}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{MENSAGEM_RECURSO_BLOQUEADO}</p>
      </div>
      <Button asChild>
        <Link href="/planos">Ver planos</Link>
      </Button>
    </div>
  )
}
