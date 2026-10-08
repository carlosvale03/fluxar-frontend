"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Lock, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePlan } from "@/hooks/use-plan"
import type { ChaveDeRecurso } from "@/types/planos"

export const MENSAGEM_RECURSO_BLOQUEADO = "Este recurso não está disponível no seu plano."

interface RecursoBloqueadoProps {
  chave: ChaveDeRecurso
  children: ReactNode
  // Nome do recurso no título do aviso
  titulo?: string
  // Aviso de uma linha, para o lugar de um botão ou de uma opção
  compacto?: boolean
}

// PERM-19: com o recurso fechado, mostra o aviso do plano e o link para os
// planos no lugar do conteúdo; o conteúdo nem é montado, então as rotas dele
// não são chamadas. Sem o acesso carregado, não mostra nada até saber.
export function RecursoBloqueado({ chave, children, titulo, compacto = false }: RecursoBloqueadoProps) {
  const { podeUsar } = usePlan()
  const liberado = podeUsar(chave)

  if (liberado === null) return null
  if (liberado) return <>{children}</>

  return compacto ? <AvisoCompacto /> : <AvisoDoPlano titulo={titulo} />
}

export function AvisoCompacto() {
  return (
    <div
      role="note"
      className="flex items-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
    >
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span>{MENSAGEM_RECURSO_BLOQUEADO}</span>
      <Link href="/planos" className="ml-auto font-bold underline underline-offset-2">
        Ver planos
      </Link>
    </div>
  )
}

export function AvisoDoPlano({ titulo }: { titulo?: string }) {
  return (
    <div
      role="note"
      className="flex flex-col items-center justify-center p-12 text-center space-y-6 bg-muted/20 rounded-[40px] border border-dashed border-border/40 animate-in fade-in duration-500"
    >
      <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/10">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-2xl font-black uppercase tracking-tight">{titulo ?? "Recurso do plano"}</h3>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed">{MENSAGEM_RECURSO_BLOQUEADO}</p>
      </div>
      <Button
        asChild
        className="rounded-2xl font-black uppercase tracking-widest text-xs px-10 h-12 bg-primary hover:bg-primary/90 border-0 shadow-lg shadow-primary/20 text-white"
      >
        <Link href="/planos">Ver planos</Link>
      </Button>
    </div>
  )
}
