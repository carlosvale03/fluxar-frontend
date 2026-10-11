"use client"

import { Check, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Category } from "@/types/categories"

interface EtapasDoPlanoProps {
  // 2: escolha do modelo; 3: partes no editor
  etapa: 2 | 3
  categoriasDoSalario: string[]
  categorias: Category[] | null
  onEscolherReceitas: () => void
}

const ETAPAS = ["Receitas de salário", "Modelo", "Partes"] as const

// O guia de quem ainda não tem plano: receitas de salário (no painel ao
// lado), modelo e partes
export function EtapasDoPlano({ etapa, categoriasDoSalario, categorias, onEscolherReceitas }: EtapasDoPlanoProps) {
  const temReceitas = categoriasDoSalario.length > 0
  const nomes = (categorias ?? [])
    .flatMap((c) => [c, ...(c.subcategories ?? [])])
    .filter((c) => categoriasDoSalario.includes(c.id))
    .map((c) => c.name)

  return (
    <div className="space-y-3">
      <ol aria-label="Etapas do plano" className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {ETAPAS.map((nome, i) => {
          const numero = i + 1
          const feita = numero === 1 ? temReceitas : numero < etapa
          const atual = numero === etapa
          return (
            <li key={nome} aria-current={atual ? "step" : undefined} className="flex items-center gap-2">
              {i > 0 && <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground/60" />}
              <span
                aria-hidden
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  atual
                    ? "bg-primary text-primary-foreground"
                    : feita
                      ? "bg-primary/15 text-primary"
                      : numero === 1
                        ? "border border-amber-500/60 text-amber-700 dark:text-amber-400"
                        : "border border-border text-muted-foreground",
                )}
              >
                {feita && !atual ? <Check className="h-3.5 w-3.5" /> : numero}
              </span>
              <span className={atual ? "font-medium" : "text-muted-foreground"}>
                <span className="sr-only">{`Etapa ${numero}: `}</span>
                {nome}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-x-2">
        <p className={cn("text-sm", temReceitas ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400")}>
          {temReceitas
            ? `Contam como salário: ${nomes.length ? nomes.join(", ") : `${categoriasDoSalario.length} categorias`}.`
            : "Nenhuma receita marcada como salário ainda."}
        </p>
        <Button variant="link" className="h-10 px-1" onClick={onEscolherReceitas}>
          {temReceitas ? "Alterar" : "Escolher receitas"}
        </Button>
      </div>
    </div>
  )
}
