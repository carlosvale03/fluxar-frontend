"use client"

import { BookOpen, PencilRuler } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { percentualParaCampo, porcentagemNoHistorico } from "@/lib/salario"
import { cn } from "@/lib/utils"
import type { ModeloDeDivisao, ReferenciasDoSalario } from "@/types/salario"

interface EscolhaDoModeloProps {
  modelos: ModeloDeDivisao[] | null
  referencias: ReferenciasDoSalario | null
  onEscolher: (modelo: ModeloDeDivisao) => void
  onCancelar?: () => void
}

// SALARIO-01: os três modelos da literatura, cada um com a obra de origem e
// as partes, e o Personalizado. SALARIO-54: ao lado das partes que
// correspondem a uma classe, quanto essa classe ocupou do salário no histórico.
export function EscolhaDoModelo({ modelos, referencias, onEscolher, onCancelar }: EscolhaDoModeloProps) {
  return (
    <section aria-label="Escolha do modelo" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight">Como você quer dividir o salário?</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Comece por um modelo conhecido e ajuste as partes depois, ou monte o seu do zero.
          </p>
        </div>
        {onCancelar && (
          <Button variant="ghost" className="rounded-2xl font-bold text-xs self-start sm:self-auto" onClick={onCancelar}>
            Voltar ao meu plano
          </Button>
        )}
      </div>

      {modelos === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-[32px]" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Modelos">
          {modelos.map((modelo) => {
            const personalizado = modelo.parts.length === 0
            return (
              <li key={modelo.code} aria-label={modelo.name}>
                <Card
                  className={cn(
                    "h-full rounded-[32px] overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm flex flex-col",
                    personalizado && "border-dashed",
                  )}
                >
                  <CardContent className="p-6 flex flex-col gap-4 flex-1">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black tracking-tight">{modelo.name}</h3>
                      {modelo.book ? (
                        <p className="text-xs text-muted-foreground font-medium flex items-start gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>
                            {modelo.author}, <em>{modelo.book}</em>
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground font-medium flex items-start gap-1.5">
                          <PencilRuler className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>Comece sem partes e monte o plano do seu jeito.</span>
                        </p>
                      )}
                    </div>

                    {!personalizado && (
                      <ul className="space-y-1.5 flex-1">
                        {modelo.parts.map((parte) => {
                          const historico = porcentagemNoHistorico(parte.reference, referencias)
                          return (
                            <li key={parte.name} className="text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{parte.name}</span>
                                <span className="font-black">{percentualParaCampo(parte.value)}%</span>
                              </div>
                              {historico && (
                                <p className="text-[11px] text-muted-foreground font-medium">{historico} no seu histórico</p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    <Button
                      variant={personalizado ? "outline" : "default"}
                      className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-10 mt-auto"
                      onClick={() => onEscolher(modelo)}
                      aria-label={`Usar o modelo ${modelo.name}`}
                    >
                      Usar este modelo
                    </Button>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
