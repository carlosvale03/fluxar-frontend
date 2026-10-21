"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { usePlan } from "@/hooks/use-plan"
import type { ChaveDeLimite } from "@/types/planos"

export const MENSAGEM_LIMITE_ATINGIDO = "Você atingiu o limite do seu plano."

interface AvisoDeLimiteProps {
  chave: ChaveDeLimite
  // Como chamar os itens no texto do uso ("contas", "cartões"...)
  rotulo: string
  // Uso contado na tela, quando o /auth/me não traz (limite_subcategorias)
  usado?: number
}

// PERM-20: mostra o uso e o limite do plano; no limite, avisa e oferece o link
// para os planos. Quem desabilita a criação é a tela, com `limiteAtingido`.
export function AvisoDeLimite({ chave, rotulo, usado }: AvisoDeLimiteProps) {
  const { limite, limiteAtingido } = usePlan()
  const uso = limite(chave)
  if (!uso || uso.limit === null) return null

  const emUso = usado ?? uso.used ?? 0
  const atingido = limiteAtingido(chave, usado)

  if (!atingido) {
    return (
      <p className="text-xs font-medium text-muted-foreground">
        {emUso} de {uso.limit} {rotulo} do seu plano
      </p>
    )
  }

  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-r-lg border border-border border-l-[3px] border-l-warn bg-card p-4"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold">{MENSAGEM_LIMITE_ATINGIDO}</h4>
        <p className="max-w-2xl text-sm leading-relaxed text-fg-secondary">
          {emUso} de {uso.limit} {rotulo} do seu plano.{" "}
          <Link href="/planos" className="font-semibold text-gold-line underline underline-offset-2">
            Ver planos
          </Link>
        </p>
      </div>
    </div>
  )
}
