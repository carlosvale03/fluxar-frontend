"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Link2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErroDoBloco } from "@/components/reports/erro-do-bloco"
import { formatarMoeda } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { buscarGastosPuxados } from "@/services/vinculos"
import type { GrupoDeGastosPuxados } from "@/types/reports"

export const TITULO_GASTOS_PUXADOS = "Gastos puxados"
export const SEM_GASTOS_PUXADOS = "Nenhum gasto vinculado no período."

interface GastosPuxadosProps {
  // Período dos gráficos simples da tela Cartas
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
        tratarErro(error, { mensagemPadrao: "Não foi possível carregar os gastos puxados." })
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
      <Card className="h-full">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3>{TITULO_GASTOS_PUXADOS}</h3>
          </CardTitle>
          <CardDescription>Quanto cada categoria puxou de gastos em outras</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {grupos === null ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true">
              <Skeleton className="h-[140px] w-full" />
              <Skeleton className="h-[140px] w-full" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{SEM_GASTOS_PUXADOS}</h4>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Vincule um lançamento a outro para ver quanto cada categoria puxou de outras.
                </p>
              </div>
              <Link
                href="/transacoes"
                className="inline-flex items-center gap-1 text-sm font-medium text-fg-secondary transition-colors duration-fast hover:text-foreground"
              >
                Abrir o Diário de Bordo <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {grupos.map((grupo) => (
                <li
                  key={grupo.category_id ?? "sem-categoria"}
                  className="space-y-3 rounded-md border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: grupo.color }} />
                      <h4 className="truncate text-sm font-semibold">{grupo.category_name}</h4>
                    </div>
                    <span className="value-m shrink-0 text-muted-foreground">
                      {formatarMoeda(grupo.total)} puxados
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {grupo.pulled.map((puxado) => (
                      <li
                        key={puxado.category_id ?? "sem-categoria"}
                        className="flex items-center gap-2 text-sm text-fg-secondary"
                      >
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: puxado.color }} />
                        <span>
                          {grupo.category_name} puxou <strong className="value-m font-medium text-foreground">{formatarMoeda(puxado.amount)}</strong> de {puxado.category_name}
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
