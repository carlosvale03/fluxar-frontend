"use client"

import { useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { nomeDoPlano } from "@/hooks/use-plan"
import { tratarErro } from "@/lib/erros"
import type { MudancaDosPlanos } from "@/services/admin"
import { PLANOS, type Plano, type TravaDoCatalogo } from "@/types/planos"

interface TabelaDeTravasProps {
  catalogo: TravaDoCatalogo[]
  // Grava a mudança; rejeita com o erro da API
  aoMudar: (mudanca: MudancaDosPlanos) => Promise<void>
}

// PERM-10 e PERM-11: cada trava do catálogo com o valor de cada plano; recurso
// com interruptor, limite com um número ou "sem limite"
export function TabelaDeTravas({ catalogo, aoMudar }: TabelaDeTravasProps) {
  const recursos = catalogo.filter((trava) => trava.type === "feature")
  const limites = catalogo.filter((trava) => trava.type === "limit")

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left">
            <th className="py-3 pr-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Trava</th>
            {PLANOS.map((plano) => (
              <th
                key={plano}
                className="py-3 px-4 text-center font-black uppercase tracking-widest text-[10px] text-muted-foreground"
              >
                {nomeDoPlano(plano)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          <Grupo titulo="Recursos" />
          {recursos.map((trava) => (
            <tr key={trava.key}>
              <Descricao trava={trava} />
              {PLANOS.map((plano) => (
                <td key={plano} className="py-3 px-4 text-center">
                  <InterruptorDeRecurso trava={trava} plano={plano} aoMudar={aoMudar} />
                </td>
              ))}
            </tr>
          ))}
          <Grupo titulo="Limites" />
          {limites.map((trava) => (
            <tr key={trava.key}>
              <Descricao trava={trava} />
              {PLANOS.map((plano) => {
                const limite = (trava.values[plano] as { limit: number | null }).limit
                return (
                  <td key={plano} className="py-3 px-4 align-top">
                    {/* A chave com o valor recria a célula quando a API devolve um valor novo */}
                    <CelulaDeLimite
                      key={`${plano}-${limite}`}
                      trava={trava}
                      plano={plano}
                      limite={limite}
                      aoMudar={aoMudar}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
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

function Descricao({ trava }: { trava: TravaDoCatalogo }) {
  return (
    <td className="py-3 pr-4">
      <p className="font-bold">{trava.name}</p>
      <p className="text-xs text-muted-foreground">{trava.description}</p>
    </td>
  )
}

interface CelulaProps {
  trava: TravaDoCatalogo
  plano: Plano
  aoMudar: TabelaDeTravasProps["aoMudar"]
}

function InterruptorDeRecurso({ trava, plano, aoMudar }: CelulaProps) {
  const [enviando, setEnviando] = useState(false)

  const mudar = async (enabled: boolean) => {
    setEnviando(true)
    try {
      await aoMudar({ key: trava.key, plan: plano, enabled })
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao gravar a trava." })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Switch
      aria-label={`${trava.name} no ${nomeDoPlano(plano)}`}
      checked={trava.values[plano] === true}
      onCheckedChange={mudar}
      disabled={enviando}
    />
  )
}

function CelulaDeLimite({ trava, plano, limite, aoMudar }: CelulaProps & { limite: number | null }) {
  const [texto, setTexto] = useState(limite === null ? "" : String(limite))
  const [semLimite, setSemLimite] = useState(limite === null)
  const [erro, setErro] = useState<string | null>(null)
  const nome = `${trava.name} no ${nomeDoPlano(plano)}`
  const idSemLimite = `sem-limite-${trava.key}-${plano}`

  const enviar = async (limit: number | null) => {
    setErro(null)
    try {
      await aoMudar({ key: trava.key, plan: plano, limit })
    } catch (error) {
      // PERM-12: o erro de `limit` aparece no campo
      tratarErro(error, {
        form: { setError: (_campo: never, { message }: { message: string }) => setErro(message) },
        campos: ["limit"],
        mensagemPadrao: "Erro ao gravar o limite.",
      })
    }
  }

  const confirmar = () => {
    if (semLimite || texto.trim() === "") return
    const valor = Number(texto)
    if (valor === limite) return
    enviar(valor)
  }

  const mudarSemLimite = (marcado: boolean) => {
    setSemLimite(marcado)
    if (marcado) {
      setTexto("")
      if (limite !== null) enviar(null)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Input
        type="number"
        min={0}
        step={1}
        aria-label={`Limite de ${nome}`}
        value={texto}
        disabled={semLimite}
        placeholder={semLimite ? "∞" : ""}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirmar()
        }}
        className="h-9 w-24 text-center rounded-xl"
      />
      <label htmlFor={idSemLimite} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
        <Checkbox
          id={idSemLimite}
          aria-label={`Sem limite de ${nome}`}
          checked={semLimite}
          onCheckedChange={(marcado) => mudarSemLimite(marcado === true)}
        />
        Sem limite
      </label>
      {erro && <p className="text-[10px] font-medium text-destructive max-w-32 text-center">{erro}</p>}
    </div>
  )
}
