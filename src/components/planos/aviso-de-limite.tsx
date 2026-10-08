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
      className="p-4 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-4"
    >
      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="font-bold text-sm">{MENSAGEM_LIMITE_ATINGIDO}</h4>
        <p className="text-xs leading-relaxed max-w-2xl">
          {emUso} de {uso.limit} {rotulo} do seu plano.{" "}
          <Link href="/planos" className="font-bold underline underline-offset-2">
            Ver planos
          </Link>
        </p>
      </div>
    </div>
  )
}
