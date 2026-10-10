"use client"

import { useState, type FormEvent } from "react"
import { format } from "date-fns"
import { AlertTriangle, Pencil } from "lucide-react"
import { toast } from "sonner"

import { BarraDaDivisao, COR_DO_LIVRE, PontoDaCor, corDaParte } from "@/components/salario/BarraDaDivisao"
import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { lerData } from "@/lib/datas"
import { deCentavos, formatarMoeda, maiorQueZero, paraCentavos } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { montarBarra, percentualParaCampo, porcentagemNoHistorico, textoDoPercentual } from "@/lib/salario"
import { salarioService } from "@/services/salario"
import type { ParteDoPlano, ParteEnviada, ReferenciasDoSalario, Simulacao } from "@/types/salario"

interface ResumoDoPlanoProps {
  partes: ParteDoPlano[]
  referencias: ReferenciasDoSalario | null
  onEditar: () => void
  // Valor que já vem no campo da simulação: o salário recebido mais recente
  valorSugerido?: string
}

function destinoDaParte(parte: ParteDoPlano): { texto: string; falta: boolean } {
  if (parte.destination_type === "SALARY_ACCOUNT") return { texto: "Fica na conta do salário", falta: false }
  if (parte.destination_type === "GOAL" && parte.destination_name) return { texto: `Meta: ${parte.destination_name}`, falta: false }
  if (parte.destination_type === "ACCOUNT" && parte.destination_name) return { texto: parte.destination_name, falta: false }
  return { texto: "Sem destino", falta: true }
}

const regraDaParte = (parte: ParteDoPlano) =>
  parte.rule_type === "PERCENT" ? `${percentualParaCampo(parte.value)}%` : formatarMoeda(parte.value)

const enviada = (parte: ParteDoPlano): ParteEnviada => ({
  name: parte.name,
  rule_type: parte.rule_type,
  value: parte.value,
  destination_type: parte.destination_type,
  account: parte.account,
  goal: parte.goal,
  reference: parte.reference,
})

// SALARIO-12, SALARIO-13, SALARIO-54 e SALARIO-55: o plano salvo como uma
// barra de proporção e a legenda com destino, regra, histórico e o pedido da
// meta. A simulação põe o valor de cada parte na própria legenda.
export function ResumoDoPlano({ partes, referencias, onEditar, valorSugerido }: ResumoDoPlanoProps) {
  const [valorSimulado, setValorSimulado] = useState(valorSugerido ?? "")
  const [sugeridoAnterior, setSugeridoAnterior] = useState(valorSugerido)
  // O salário recebido pode chegar depois do plano: preenche o campo se o
  // usuário ainda não digitou nada
  if (valorSugerido !== sugeridoAnterior) {
    setSugeridoAnterior(valorSugerido)
    if (!valorSimulado && valorSugerido) setValorSimulado(valorSugerido)
  }
  const [simulacao, setSimulacao] = useState<Simulacao | null>(null)
  const [simulando, setSimulando] = useState(false)

  const mediaDoSalario = referencias ? paraCentavos(referencias.history.salary_average) : 0
  const base = simulacao ? paraCentavos(simulacao.amount) : mediaDoSalario > 0 ? mediaDoSalario : null
  // Com a simulação, a barra mostra o que cada parte recebeu de fato
  const barra = simulacao
    ? montarBarra(
        simulacao.items.map((item) => ({ nome: item.name, regra: "FIXED" as const, valor: item.amount })),
        base,
      )
    : montarBarra(
        partes.map((p) => ({ nome: p.name, regra: p.rule_type, valor: p.value })),
        base,
      )
  const temFixas = partes.some((p) => p.rule_type === "FIXED")
  const livreEmReais = simulacao
    ? paraCentavos(simulacao.amount) - simulacao.items.reduce((soma, item) => soma + paraCentavos(item.amount), 0)
    : 0

  // SALARIO-13: quanto vai para cada parte e quanto fica livre, sem gravar nada
  const simular = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!maiorQueZero(valorSimulado)) {
      toast.error("Digite o valor do salário para simular.")
      return
    }
    setSimulando(true)
    try {
      setSimulacao(await salarioService.simular(valorSimulado, partes.map(enviada)))
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao simular a divisão." })
    } finally {
      setSimulando(false)
    }
  }

  return (
    <div role="region" aria-label="Plano de divisão" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">
          As partes são atendidas na ordem da lista. O que sobrar fica livre na conta do salário.
        </p>
        <Button variant="outline" className="h-10 shrink-0 rounded-xl px-4 self-start" onClick={onEditar}>
          <Pencil aria-hidden /> Editar plano
        </Button>
      </div>

      <div className="space-y-2">
        <BarraDaDivisao barra={barra} />
        {simulacao ? (
          <p className="text-xs text-muted-foreground tabular-nums">Com um salário de {formatarMoeda(simulacao.amount)}</p>
        ) : temFixas && base ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            Partes em R$ comparadas à sua média de salário, {formatarMoeda(deCentavos(base))}
          </p>
        ) : barra.fixasForaDaBarra > 0 ? (
          <p className="text-xs text-muted-foreground">Partes em R$ entram na barra quando você simula um valor.</p>
        ) : null}
      </div>

      <ul className="divide-y divide-border" aria-label="Partes do plano">
        {partes.map((parte, indice) => {
          const destino = destinoDaParte(parte)
          const historico = porcentagemNoHistorico(parte.reference, referencias)
          const item = simulacao?.items[indice]
          return (
            <li key={parte.id} aria-label={parte.name} className="flex items-start gap-3 py-3">
              <PontoDaCor className={`mt-1.5 ${corDaParte(indice)}`} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium">{parte.name}</p>
                {destino.falta ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle aria-hidden className="h-3.5 w-3.5" /> Sem destino
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{destino.texto}</p>
                )}
                {historico && <p className="text-xs text-muted-foreground">{historico} no seu histórico</p>}
                {parte.goal_monthly_needed && parte.goal_target_date && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    A meta pede {formatarMoeda(parte.goal_monthly_needed)} por mês até {format(lerData(parte.goal_target_date), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{item ? formatarMoeda(item.amount) : regraDaParte(parte)}</p>
                {item && <p className="text-xs text-muted-foreground tabular-nums">{regraDaParte(parte)}</p>}
                {item?.reduced && <p className="text-xs font-medium text-amber-700 dark:text-amber-400">reduzida</p>}
              </div>
            </li>
          )
        })}
        {(simulacao ? livreEmReais > 0 : barra.livre > 0) && (
          <li aria-label="Livre" className="flex items-start gap-3 py-3">
            <PontoDaCor className={`mt-1.5 ${COR_DO_LIVRE}`} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">Livre</p>
              <p className="text-xs text-muted-foreground">Não vai para nenhuma parte</p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {simulacao ? formatarMoeda(deCentavos(livreEmReais)) : textoDoPercentual(barra.livre)}
            </p>
          </li>
        )}
      </ul>

      {simulacao && (
        <div className="space-y-1 rounded-xl bg-muted/40 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Sai em transferências e aportes</span>
            <span className="font-semibold tabular-nums">{formatarMoeda(simulacao.total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Fica livre na conta do salário</span>
            <span className="font-semibold tabular-nums">{formatarMoeda(simulacao.free)}</span>
          </div>
        </div>
      )}

      <form onSubmit={simular} className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <label htmlFor="valor-simulado" className="text-sm text-muted-foreground">
          Simular com
        </label>
        <MoneyInput
          id="valor-simulado"
          aria-label="Valor do salário"
          value={valorSimulado}
          placeholder="R$ 0,00"
          className="h-10 w-40 rounded-xl tabular-nums"
          onValueChange={(valor) => {
            setValorSimulado(valor ?? "")
            setSimulacao(null)
          }}
        />
        <Button type="submit" variant="outline" className="h-10 rounded-xl px-4" loading={simulando}>
          Simular
        </Button>
        {simulacao && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-3"
            onClick={() => {
              setSimulacao(null)
              setValorSimulado("")
            }}
          >
            Limpar
          </Button>
        )}
      </form>
    </div>
  )
}
