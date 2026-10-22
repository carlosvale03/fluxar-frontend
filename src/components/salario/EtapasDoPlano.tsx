"use client"

import { AlertTriangle, Check, ChevronRight } from "lucide-react"

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
// lado), modelo e partes. AZ-28: o progresso fica à vista; a volta para o
// modelo é o "Trocar de modelo" do editor, que confirma antes de descartar.
export function EtapasDoPlano({ etapa, categoriasDoSalario, categorias, onEscolherReceitas }: EtapasDoPlanoProps) {
  const temReceitas = categoriasDoSalario.length > 0
  const nomes = (categorias ?? [])
    .flatMap((c) => [c, ...(c.subcategories ?? [])])
    .filter((c) => categoriasDoSalario.includes(c.id))
    .map((c) => c.name)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="label text-muted-foreground">{`Etapa ${etapa} de ${ETAPAS.length}`}</span>
        <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-elevated">
          <span
            className="block h-full rounded-full bg-gold-line motion-safe:transition-[width] motion-safe:duration-base motion-safe:ease-az-out"
            style={{ width: `${(etapa / ETAPAS.length) * 100}%` }}
          />
        </span>
      </div>

      <ol aria-label="Etapas do plano" className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {ETAPAS.map((nome, i) => {
          const numero = i + 1
          const feita = numero === 1 ? temReceitas : numero < etapa
          const atual = numero === etapa
          const pendente = numero === 1 && !temReceitas
          return (
            <li key={nome} aria-current={atual ? "step" : undefined} className="flex items-center gap-2">
              {i > 0 && <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />}
              <span
                aria-hidden
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs tabular-nums",
                  atual
                    ? "bg-gold text-gold-ink"
                    : feita
                      ? "border border-border-strong text-inflow"
                      : pendente
                        ? "border border-warn text-warn"
                        : "border border-border text-muted-foreground",
                )}
              >
                {feita && !atual ? <Check className="h-3.5 w-3.5" /> : pendente ? <AlertTriangle className="h-3 w-3" /> : numero}
              </span>
              <span className={atual ? "font-medium text-foreground" : "text-muted-foreground"}>
                <span className="sr-only">{`Etapa ${numero}: `}</span>
                {nome}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-x-2">
        <p className={cn("text-sm", temReceitas ? "text-muted-foreground" : "text-warn")}>
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
