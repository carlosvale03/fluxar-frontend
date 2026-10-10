"use client"

import { useEffect, useState } from "react"
import { Link2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErroDoBloco } from "@/components/reports/erro-do-bloco"
import { formatarMoeda } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { cn } from "@/lib/utils"
import { buscarGastosPuxados } from "@/services/vinculos"
import type { GrupoDeGastosPuxados } from "@/types/reports"

export const TITULO_GASTOS_PUXADOS = "Gastos puxados"
export const SEM_GASTOS_PUXADOS = "Nenhum gasto vinculado no período."

interface GastosPuxadosProps {
  // Período dos gráficos simples da tela Relatórios
  period: string
  className?: string
}

// VINCULO-36 e VINCULO-37: para cada categoria das principais, o total puxado
// e a divisão por categoria, como "Lazer puxou R$ 180,00 de Transporte". A
// tela monta este bloco dentro de RecursoBloqueado chave="vinculos": travado,
// a rota nem é chamada (VINCULO-20).
export function GastosPuxados({ period, className }: GastosPuxadosProps) {
  const [grupos, setGrupos] = useState<GrupoDeGastosPuxados[] | null>(null)
  const [erro, setErro] = useState(false)

  // "Tentar de novo" pede uma nova busca
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let valida = true
    buscarGastosPuxados(period).then(
      (relatorio) => {
        if (!valida) return
        setGrupos(relatorio.groups)
        setErro(false)
      },
      (error) => {
        if (!valida) return
        setErro(true)
        tratarErro(error, { mensagemPadrao: "Erro ao carregar os gastos puxados." })
      },
    )
    // A resposta de um período antigo é descartada
    return () => {
      valida = false
    }
  }, [period, tentativa])

  const tentarDeNovo = () => {
    setErro(false)
    setGrupos(null)
    setTentativa((n) => n + 1)
  }

  if (erro) return <ErroDoBloco titulo={TITULO_GASTOS_PUXADOS} onTentarDeNovo={tentarDeNovo} className={className} />

  return (
    <section aria-label={TITULO_GASTOS_PUXADOS} className={className}>
      <Card className="h-full border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[32px] overflow-hidden">
        <CardHeader className="pb-0 pt-6 px-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            {TITULO_GASTOS_PUXADOS}
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Quanto cada categoria puxou de gastos em outras
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {grupos === null ? (
            <Skeleton className="w-full h-[160px] rounded-2xl" />
          ) : grupos.length === 0 ? (
            <p className="py-10 text-center text-sm font-medium text-muted-foreground">{SEM_GASTOS_PUXADOS}</p>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {grupos.map((grupo) => (
                <li
                  key={grupo.category_id ?? "sem-categoria"}
                  className="rounded-[24px] border border-border/40 bg-muted/10 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: grupo.color }} />
                      <h4 className="font-black text-sm truncate">{grupo.category_name}</h4>
                    </div>
                    <span className="text-xs font-black tabular-nums text-muted-foreground">
                      {formatarMoeda(grupo.total)} puxados
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {grupo.pulled.map((puxado) => (
                      <li
                        key={puxado.category_id ?? "sem-categoria"}
                        className={cn("flex items-center gap-2 text-xs font-medium text-foreground/80")}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: puxado.color }} />
                        <span>
                          {grupo.category_name} puxou <strong className="font-black tabular-nums">{formatarMoeda(puxado.amount)}</strong> de {puxado.category_name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
