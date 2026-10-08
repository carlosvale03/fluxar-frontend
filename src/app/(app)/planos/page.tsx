"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Minus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      tratarErro(error, { mensagemPadrao: "Erro ao carregar os planos.", tentarDeNovo: carregar })
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const recursos = dados?.catalog.filter((trava) => trava.type === "feature") ?? []
  const limites = dados?.catalog.filter((trava) => trava.type === "limit") ?? []

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase">Planos</h1>
        <p className="text-sm text-muted-foreground mt-1">O que cada plano do Fluxar libera.</p>
        {liberacaoDeTestes && (
          <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">
            Todos os recursos estão liberados durante a fase de testes.
          </p>
        )}
      </div>

      {!dados ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="rounded-[32px] border-border/60 shadow-sm bg-card overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">Recursos e limites</CardTitle>
            <CardDescription>Seu plano atual: {nomeDoPlano(dados.plan)}</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left">
                  <th className="py-3 pr-4" />
                  {PLANOS.map((plano) => {
                    const doUsuario = plano === dados.plan
                    return (
                      <th
                        key={plano}
                        aria-current={doUsuario ? "true" : undefined}
                        className={cn(
                          "py-3 px-4 text-center font-black uppercase tracking-widest text-xs",
                          doUsuario && "bg-primary/10 text-primary rounded-t-2xl",
                        )}
                      >
                        {nomeDoPlano(plano)}
                        {doUsuario && (
                          <Badge className="ml-2 rounded-full text-[9px] font-black uppercase">Seu plano</Badge>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
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
      <td colSpan={PLANOS.length + 1} className="pt-6 pb-2 font-black uppercase tracking-widest text-xs text-primary">
        {titulo}
      </td>
    </tr>
  )
}

function Linha({ trava, planoDoUsuario }: { trava: TravaDoCatalogo; planoDoUsuario: Plano }) {
  return (
    <tr>
      <td className="py-3 pr-4">
        <p className="font-bold">{trava.name}</p>
        <p className="text-xs text-muted-foreground">{trava.description}</p>
      </td>
      {PLANOS.map((plano) => (
        <td
          key={plano}
          className={cn("py-3 px-4 text-center", plano === planoDoUsuario && "bg-primary/5")}
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
      <span className="inline-flex items-center gap-1 text-emerald-600">
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
  return <span className="font-bold">{valor.limit === null ? "Sem limite" : `Até ${valor.limit}`}</span>
}
