"use client"

import { BarraDaDivisao, PontoDaCor, corDaParte } from "@/components/salario/BarraDaDivisao"
import { ComoFunciona } from "@/components/salario/SobreOModelo"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { montarBarra, percentualParaCampo, porcentagemNoHistorico } from "@/lib/salario"
import type { ModeloDeDivisao, ReferenciasDoSalario } from "@/types/salario"

interface EscolhaDoModeloProps {
  modelos: ModeloDeDivisao[] | null
  referencias: ReferenciasDoSalario | null
  onEscolher: (modelo: ModeloDeDivisao) => void
  onCancelar?: () => void
}

// SALARIO-01 e SALARIO-57: os três modelos da literatura, cada um com a obra
// de origem, a proporção das partes e "Como funciona", e o Personalizado.
// SALARIO-54: ao lado das partes que correspondem a uma classe, quanto essa
// classe ocupou do salário no histórico. A linha inteira escolhe o modelo.
export function EscolhaDoModelo({ modelos, referencias, onEscolher, onCancelar }: EscolhaDoModeloProps) {
  return (
    <div role="region" aria-label="Escolha do modelo" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium">Escolha um modelo</h3>
          <p className="text-sm text-muted-foreground">Comece por um modelo conhecido e ajuste as partes depois.</p>
        </div>
        {onCancelar && (
          <Button variant="ghost" className="h-10 shrink-0 rounded-md px-3 self-start" onClick={onCancelar}>
            Voltar ao meu plano
          </Button>
        )}
      </div>

      {modelos === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border" aria-label="Modelos">
          {modelos.map((modelo) => {
            const personalizado = modelo.parts.length === 0
            return (
              <li
                key={modelo.code}
                aria-label={modelo.name}
                className="relative flex flex-col gap-3 p-4 transition-colors duration-fast hover:bg-elevated focus-within:bg-elevated sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{modelo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {modelo.book ? (
                        <>
                          {modelo.author}, <em>{modelo.book}</em>
                        </>
                      ) : (
                        "Comece do zero."
                      )}
                    </p>
                  </div>

                  {!personalizado && (
                    <>
                      <BarraDaDivisao
                        className="h-2"
                        barra={montarBarra(
                          modelo.parts.map((p) => ({ nome: p.name, regra: p.rule_type, valor: p.value })),
                          null,
                        )}
                      />
                      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {modelo.parts.map((parte, indice) => {
                          const historico = porcentagemNoHistorico(parte.reference, referencias)
                          return (
                            <li key={parte.name} className="flex items-center gap-1.5">
                              <PontoDaCor className={corDaParte(indice)} />
                              <span className="text-muted-foreground">{parte.name}</span>
                              <span className="font-medium tabular-nums">{percentualParaCampo(parte.value)}%</span>
                              {historico && <span className="text-muted-foreground">({historico} no seu histórico)</span>}
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}

                  {/* Acima da camada do botão, para abrir sem escolher o modelo */}
                  <ComoFunciona codigo={modelo.code} className="relative z-10" />
                </div>

                {/* O ::after cobre a linha toda, para a linha inteira escolher o modelo */}
                <Button
                  variant="outline"
                  className="h-10 shrink-0 rounded-md px-4 self-start after:absolute after:inset-0 after:content-[''] sm:self-auto"
                  onClick={() => onEscolher(modelo)}
                  aria-label={`Usar o modelo ${modelo.name}`}
                >
                  Usar este modelo
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
