"use client"

import { useRef, useState, type FormEvent } from "react"
import { format } from "date-fns"
import { AlertTriangle, Pencil, Shuffle } from "lucide-react"
import { toast } from "sonner"

import { BarraDaDivisao, COR_DO_LIVRE, PontoDaCor, corDaParte } from "@/components/salario/BarraDaDivisao"
import { SobreAParte } from "@/components/salario/SobreOModelo"
import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { lerData } from "@/lib/datas"
import { deCentavos, formatarMoeda, maiorQueZero, paraCentavos } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { baseDaPrevia, montarBarra, percentualParaCampo, porcentagemNoHistorico, textoDaBase, textoDoPercentual } from "@/lib/salario"
import { salarioService } from "@/services/salario"
import type { ParteDoPlano, ReferenciasDoSalario, Simulacao } from "@/types/salario"

interface ResumoDoPlanoProps {
  partes: ParteDoPlano[]
  referencias: ReferenciasDoSalario | null
  onEditar: () => void
  // SALARIO-61: abre a escolha do modelo; o plano salvo fica até salvar outro
  onTrocarModelo: () => void
  // O modelo que o plano segue, para explicar as partes com o sentido dele
  codigoDoModelo?: string | null
  // Abre o editor com o foco no destino da parte nessa posição
  onEscolherDestino: (indice: number) => void
  // O valor do campo da simulação, que a página guarda para o editor também
  valorSimulado: string
  onValorSimulado: (valor: string) => void
  // O salário recebido mais recente, base das prévias sem valor simulado
  valorRecebido?: string
}

function destinoDaParte(parte: ParteDoPlano): { texto: string; falta: boolean } {
  if (parte.destination_type === "SALARY_ACCOUNT") return { texto: "Fica na conta do salário", falta: false }
  if (parte.destination_type === "GOAL" && parte.destination_name) return { texto: `Meta: ${parte.destination_name}`, falta: false }
  if (parte.destination_type === "ACCOUNT" && parte.destination_name) return { texto: parte.destination_name, falta: false }
  return { texto: "Sem destino", falta: true }
}

const regraDaParte = (parte: ParteDoPlano) =>
  parte.rule_type === "PERCENT" ? `${percentualParaCampo(parte.value)}%` : formatarMoeda(parte.value)

// SALARIO-12, SALARIO-13, SALARIO-54, SALARIO-55 e SALARIO-63: o plano salvo
// como uma barra de proporção e a legenda com destino, regra, histórico e o
// pedido da meta. O valor de cada parte é calculado na hora pela regra de
// SALARIO-26 sobre a base da prévia; "Simular" pede ao backend a divisão
// pelo plano salvo (SALARIO-13).
export function ResumoDoPlano({
  partes,
  referencias,
  onEditar,
  onTrocarModelo,
  codigoDoModelo,
  onEscolherDestino,
  valorSimulado,
  onValorSimulado,
  valorRecebido,
}: ResumoDoPlanoProps) {
  const [simulacao, setSimulacao] = useState<Simulacao | null>(null)
  const [simulando, setSimulando] = useState(false)
  // Cada simulação ganha um número, e só a resposta da última entra na tela;
  // mudar o valor ou limpar também descarta a que está a caminho
  const sequencia = useRef(0)

  const base = simulacao
    ? { centavos: paraCentavos(simulacao.amount), origem: "simulado" as const }
    : baseDaPrevia(valorSimulado, valorRecebido, referencias?.history.salary_average)
  // Com a simulação, a barra mostra o que cada parte recebeu de fato
  const barra = simulacao
    ? montarBarra(
        simulacao.items.map((item) => ({ nome: item.name, regra: "FIXED" as const, valor: item.amount })),
        base?.centavos ?? null,
      )
    : montarBarra(
        partes.map((p) => ({ nome: p.name, regra: p.rule_type, valor: p.value })),
        base?.centavos ?? null,
      )
  const temFixas = partes.some((p) => p.rule_type === "FIXED")

  // SALARIO-13: quanto vai para cada parte e quanto fica livre, sem gravar nada
  const simular = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!maiorQueZero(valorSimulado)) {
      toast.error("Digite o valor do salário para simular.")
      return
    }
    const numero = ++sequencia.current
    setSimulando(true)
    try {
      // Sem as partes, o backend usa o plano salvo: um destino inativado
      // depois não impede a simulação
      const nova = await salarioService.simular(valorSimulado)
      if (numero === sequencia.current) setSimulacao(nova)
    } catch (erro) {
      if (numero === sequencia.current) tratarErro(erro, { mensagemPadrao: "Erro ao simular a divisão." })
    } finally {
      if (numero === sequencia.current) setSimulando(false)
    }
  }

  // O valor mudou ou foi limpo: a simulação na tela e a que está a caminho
  // deixam de valer
  const descartarSimulacao = () => {
    sequencia.current += 1
    setSimulacao(null)
    setSimulando(false)
  }

  return (
    <div role="region" aria-label="Plano de divisão" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">
          As partes são atendidas na ordem da lista. O que sobrar fica livre na conta do salário.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2 self-start">
          <Button variant="ghost" className="h-10 rounded-xl px-3" onClick={onTrocarModelo}>
            <Shuffle aria-hidden /> Trocar de modelo
          </Button>
          <Button variant="outline" className="h-10 rounded-xl px-4" onClick={onEditar}>
            <Pencil aria-hidden /> Editar plano
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <BarraDaDivisao barra={barra} />
        {base ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {textoDaBase(base)}
            {temFixas && ". Os percentuais valem sobre o que sobra depois das partes em R$."}
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
          const fatia = barra.fatias[indice]
          const valor = item ? item.amount : fatia?.centavos != null ? deCentavos(fatia.centavos) : null
          const reduzida = item ? item.reduced : (fatia?.reduzida ?? false)
          return (
            <li key={parte.id} aria-label={parte.name} className="flex items-start gap-3 py-3">
              <PontoDaCor className={`mt-1.5 ${corDaParte(indice)}`} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-0.5">
                  <p className="text-sm font-medium">{parte.name}</p>
                  <SobreAParte nome={parte.name} codigoDoModelo={codigoDoModelo} className="-my-3" />
                </div>
                {destino.falta ? (
                  <Button
                    variant="ghost"
                    className="-my-1.5 -ml-2 h-10 gap-1.5 rounded-xl px-2 text-xs font-medium text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                    aria-label={`Escolher destino de ${parte.name}`}
                    onClick={() => onEscolherDestino(indice)}
                  >
                    <AlertTriangle aria-hidden className="h-3.5 w-3.5" /> Escolher destino
                  </Button>
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
                <p className="text-sm font-semibold tabular-nums">{valor !== null ? formatarMoeda(valor) : regraDaParte(parte)}</p>
                {valor !== null && <p className="text-xs text-muted-foreground tabular-nums">{regraDaParte(parte)}</p>}
                {reduzida && <p className="text-xs font-medium text-amber-700 dark:text-amber-400">reduzida</p>}
              </div>
            </li>
          )
        })}
        {(barra.livreEmCentavos !== null ? barra.livreEmCentavos > 0 : barra.livre > 0) && (
          // O recebido menos todas as partes; o resultado da simulação soma a
          // isto as partes que ficam na conta do salário
          <li aria-label="Livre" className="flex items-start gap-3 py-3">
            <PontoDaCor className={`mt-1.5 ${COR_DO_LIVRE}`} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">Livre</p>
              <p className="text-xs text-muted-foreground">Não vai para nenhuma parte</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">
                {barra.livreEmCentavos !== null ? formatarMoeda(deCentavos(barra.livreEmCentavos)) : textoDoPercentual(barra.livre)}
              </p>
              {barra.livreEmCentavos !== null && barra.livre > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">{textoDoPercentual(barra.livre)}</p>
              )}
            </div>
          </li>
        )}
      </ul>

      {simulacao && (
        <div role="group" aria-label="Resultado da simulação" className="space-y-1 rounded-xl bg-muted/40 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Sai em transferências e aportes</span>
            <span className="font-semibold tabular-nums">{formatarMoeda(simulacao.total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            {/* SALARIO-13: o recebido menos as transferências, com as partes que ficam na conta */}
            <span className="text-muted-foreground">Fica na conta do salário</span>
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
            // O campo também entrega o valor ao sair dele, sem mudança
            if ((valor ?? "") === valorSimulado) return
            onValorSimulado(valor ?? "")
            descartarSimulacao()
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
              descartarSimulacao()
              onValorSimulado("")
            }}
          >
            Limpar
          </Button>
        )}
      </form>
    </div>
  )
}
