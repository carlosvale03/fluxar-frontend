"use client"

import { useEffect, useState } from "react"
import { Check, Info, Minus } from "lucide-react"

import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { descricaoDaTrava, nomeDaTrava } from "@/components/planos/nomes-dos-recursos"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { nomeDoPlano, usePlan } from "@/hooks/use-plan"
import { tratarErro } from "@/lib/erros"
import { cn } from "@/lib/utils"
import { api } from "@/services/apiClient"
import { PLANOS, type Plano, type TravaDoCatalogo, type ValorDaTrava } from "@/types/planos"

interface PlanosDaApi {
  plan: Plano
  catalog: TravaDoCatalogo[]
}

// PERM-27: o que cada plano libera, pela configuração atual do painel, com o
// plano do usuário em destaque. Só exibe; não há compra nem troca de plano.
export default function PlanosPage() {
  const { liberacaoDeTestes } = usePlan()
  const [dados, setDados] = useState<PlanosDaApi | null>(null)

  const carregar = async () => {
    try {
      const response = await api.get<PlanosDaApi>("/plans/")
      setDados(response.data)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar os planos.", tentarDeNovo: carregar })
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const recursos = dados?.catalog.filter((trava) => trava.type === "feature") ?? []
  const limites = dados?.catalog.filter((trava) => trava.type === "limit") ?? []

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <CabecalhoDePagina titulo="Planos" apoio="O que cada plano do Azimute libera" />

      {liberacaoDeTestes && (
        <Alert variant="info" className="mb-6">
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>Todos os recursos estão liberados durante a fase de testes.</AlertDescription>
        </Alert>
      )}

      {!dados ? (
        <div role="status" className="space-y-3 rounded-lg border border-border bg-card p-5">
          <span className="sr-only">Carregando os planos</span>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-36" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="p-5 pb-3">
            <CardTitle role="heading" aria-level={2}>Recursos e limites</CardTitle>
            <CardDescription>Seu plano atual: {nomeDoPlano(dados.plan)}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-5 pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4">
                    <span className="sr-only">Recurso</span>
                  </th>
                  {PLANOS.map((plano) => {
                    const doUsuario = plano === dados.plan
                    return (
                      <th
                        key={plano}
                        aria-current={doUsuario ? "true" : undefined}
                        className={cn(
                          "label px-4 py-3 text-center text-muted-foreground",
                          doUsuario && "border-b-2 border-gold-line text-foreground",
                        )}
                      >
                        {nomeDoPlano(plano)}
                        {doUsuario && (
                          <Badge variant="destino" className="ml-2">Seu plano</Badge>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <Grupo titulo="Recursos" />
                {recursos.map((trava) => (
                  <Linha key={trava.key} trava={trava} planoDoUsuario={dados.plan} />
                ))}
                <Grupo titulo="Limites" />
                {limites.map((trava) => (
                  <Linha key={trava.key} trava={trava} planoDoUsuario={dados.plan} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Grupo({ titulo }: { titulo: string }) {
  return (
    <tr>
      <td colSpan={PLANOS.length + 1} className="label pb-2 pt-6 text-gold-line">
        {titulo}
      </td>
    </tr>
  )
}

function Linha({ trava, planoDoUsuario }: { trava: TravaDoCatalogo; planoDoUsuario: Plano }) {
  return (
    <tr>
      <td className="py-3 pr-4">
        <p className="font-medium text-foreground">{nomeDaTrava(trava)}</p>
        <p className="text-xs text-muted-foreground">{descricaoDaTrava(trava)}</p>
      </td>
      {PLANOS.map((plano) => (
        <td
          key={plano}
          className={cn("px-4 py-3 text-center", plano === planoDoUsuario && "bg-elevated")}
        >
          <Valor valor={trava.values[plano]} />
        </td>
      ))}
    </tr>
  )
}

function Valor({ valor }: { valor: ValorDaTrava }) {
  if (typeof valor === "boolean") {
    return valor ? (
      <span className="inline-flex items-center gap-1 text-inflow">
        <Check className="h-4 w-4" aria-hidden />
        <span className="sr-only">Incluído</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" aria-hidden />
        <span className="sr-only">Não incluído</span>
      </span>
    )
  }
  return <span className="font-mono tabular-nums text-foreground">{valor.limit === null ? "Sem limite" : `Até ${valor.limit}`}</span>
}
