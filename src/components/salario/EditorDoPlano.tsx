"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { ArrowDown, ArrowUp, Plus, Save, Shuffle, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { BarraDaDivisao, PontoDaCor, corDaParte } from "@/components/salario/BarraDaDivisao"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { lerData } from "@/lib/datas"
import { deCentavos, formatarMoeda, lerValorDigitado, maiorQueZero } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { baseDaPrevia, montarBarra, percentualParaCampo, porcentagemNoHistorico, textoDaBase, textoDoPercentual } from "@/lib/salario"
import { cn } from "@/lib/utils"
import { salarioService } from "@/services/salario"
import { AccountType, type Account } from "@/types/accounts"
import type { Goal } from "@/types/goals"
import type {
  ParteEnviada,
  PlanoDoSalario,
  ReferenciaDaParte,
  ReferenciasDoSalario,
  RegraDaParte,
  TipoDeDestino,
} from "@/types/salario"

// Uma parte como chega ao editor: do plano salvo ou de um modelo
export interface ParteInicial {
  name: string
  rule_type: RegraDaParte
  value: string
  destination_type: TipoDeDestino | null
  account?: string | null
  goal?: string | null
  destination_name?: string | null
  reference: ReferenciaDaParte
  goal_monthly_needed?: string | null
  goal_target_date?: string | null
}

interface Rascunho {
  chave: string
  name: string
  rule_type: RegraDaParte
  // Percentual: o texto do campo ("33,33"); valor fixo: o texto da API ("1234.56")
  valor: string
  // "SALARY_ACCOUNT", "ACCOUNT:<id>", "GOAL:<id>" ou "" (sem destino)
  destino: string
  reference: ReferenciaDaParte
  inicial: ParteInicial | null
}

type ErrosDaParte = Partial<Record<"name" | "value" | "destination", string>>

const CONTA_DO_SALARIO = "SALARY_ACCOUNT"
let proximaChave = 0
const novaChave = () => `parte-${++proximaChave}`

function destinoDaParte(parte: ParteInicial): string {
  if (parte.destination_type === "SALARY_ACCOUNT") return CONTA_DO_SALARIO
  if (parte.destination_type === "ACCOUNT" && parte.account) return `ACCOUNT:${parte.account}`
  if (parte.destination_type === "GOAL" && parte.goal) return `GOAL:${parte.goal}`
  return ""
}

function rascunhoDe(parte: ParteInicial): Rascunho {
  return {
    chave: novaChave(),
    name: parte.name,
    rule_type: parte.rule_type,
    valor: parte.rule_type === "PERCENT" ? percentualParaCampo(parte.value) : parte.value,
    destino: destinoDaParte(parte),
    reference: parte.reference,
    inicial: parte,
  }
}

// O que conta como mudança no editor, para pedir confirmação ao trocar de modelo
const assinatura = (partes: Rascunho[]) =>
  JSON.stringify(partes.map((p) => [p.name, p.rule_type, p.valor, p.destino]))

function destinoEnviado(destino: string): Pick<ParteEnviada, "destination_type" | "account" | "goal"> {
  if (destino === CONTA_DO_SALARIO) return { destination_type: "SALARY_ACCOUNT", account: null, goal: null }
  if (destino.startsWith("ACCOUNT:")) return { destination_type: "ACCOUNT", account: destino.slice(8), goal: null }
  if (destino.startsWith("GOAL:")) return { destination_type: "GOAL", account: null, goal: destino.slice(5) }
  return { destination_type: null, account: null, goal: null }
}

// O valor da parte para a API, ou null quando o campo não tem um valor
function valorEnviado(parte: Rascunho): string | null {
  if (parte.rule_type === "PERCENT") return lerValorDigitado(parte.valor)
  return parte.valor ? parte.valor : null
}

// SALARIO-55: quanto a meta pede por mês para chegar na data
function pedidoDaMeta(parte: Rascunho, metas: Goal[]): { mensal: string; data: string } | null {
  if (!parte.destino.startsWith("GOAL:")) return null
  const id = parte.destino.slice(5)
  const inicial = parte.inicial
  if (inicial && inicial.goal === id && inicial.goal_monthly_needed && inicial.goal_target_date) {
    return { mensal: inicial.goal_monthly_needed, data: inicial.goal_target_date }
  }
  const meta = metas.find((m) => m.id === id)
  if (meta?.target_date && meta.suggested_monthly_saving && maiorQueZero(meta.suggested_monthly_saving)) {
    return { mensal: meta.suggested_monthly_saving, data: meta.target_date }
  }
  return null
}

interface EditorDoPlanoProps {
  partesIniciais: ParteInicial[]
  // SALARIO-14: as categorias de salário salvas, reenviadas como estão; a
  // escolha delas fica no painel Receitas de salário
  categoriasDoSalario: string[]
  contas: Account[]
  metas: Goal[]
  referencias: ReferenciasDoSalario | null
  // SALARIO-63: o campo da simulação, o mesmo do resumo
  valorSimulado: string
  onValorSimulado: (valor: string) => void
  // O salário recebido mais recente, base das prévias sem valor simulado
  valorRecebido?: string
  onSalvo: (plano: PlanoDoSalario) => void
  onTrocarModelo: () => void
  // Com plano salvo: volta ao plano como estava
  onCancelar?: () => void
}

// SALARIO-04 a SALARIO-07, SALARIO-12, SALARIO-54, SALARIO-55 e SALARIO-63:
// as partes em ordem de prioridade, com regra, valor e destino, e a barra da
// divisão e o valor de cada parte mudando enquanto o plano é editado. Nada
// muda antes de salvar.
export function EditorDoPlano({
  partesIniciais,
  categoriasDoSalario,
  contas,
  metas,
  referencias,
  valorSimulado,
  onValorSimulado,
  valorRecebido,
  onSalvo,
  onTrocarModelo,
  onCancelar,
}: EditorDoPlanoProps) {
  const [partes, setPartes] = useState<Rascunho[]>(() => partesIniciais.map(rascunhoDe))
  const [assinaturaInicial] = useState(() => assinatura(partesIniciais.map(rascunhoDe)))
  const [erros, setErros] = useState<Record<string, ErrosDaParte>>({})
  const [salvando, setSalvando] = useState(false)
  const [confirmarTroca, setConfirmarTroca] = useState(false)

  // SALARIO-05: contas ativas que não são cofrinho e metas ativas
  const contasDeDestino = useMemo(
    () => contas.filter((c) => c.is_active && c.type !== AccountType.PIGGY_BANK),
    [contas],
  )
  const metasDeDestino = useMemo(() => metas.filter((m) => m.is_active !== false), [metas])

  const baseDaBarra = baseDaPrevia(valorSimulado, valorRecebido, referencias?.history.salary_average)
  const base = baseDaBarra?.centavos ?? null
  const barra = montarBarra(
    partes.map((p) => ({ nome: p.name.trim(), regra: p.rule_type, valor: valorEnviado(p) })),
    base,
  )
  const acimaDe100 = barra.somaDosPercentuais > 10000
  const temFixas = partes.some((p) => p.rule_type === "FIXED")
  const alterado = assinatura(partes) !== assinaturaInicial

  const alterar = (chave: string, mudanca: Partial<Rascunho>) => {
    setPartes((atuais) => atuais.map((p) => (p.chave === chave ? { ...p, ...mudanca } : p)))
    setErros((atuais) => {
      if (!atuais[chave]) return atuais
      const { [chave]: _removido, ...resto } = atuais
      void _removido
      return resto
    })
  }

  // SALARIO-07: a ordem define quais partes são atendidas primeiro
  const mover = (indice: number, direcao: -1 | 1) => {
    setPartes((atuais) => {
      const destino = indice + direcao
      if (destino < 0 || destino >= atuais.length) return atuais
      const novas = [...atuais]
      ;[novas[indice], novas[destino]] = [novas[destino], novas[indice]]
      return novas
    })
  }

  const remover = (chave: string) => setPartes((atuais) => atuais.filter((p) => p.chave !== chave))

  const adicionar = () =>
    setPartes((atuais) => [
      ...atuais,
      { chave: novaChave(), name: "", rule_type: "PERCENT", valor: "", destino: "", reference: "", inicial: null },
    ])

  // Trocar de modelo descarta as mudanças: com alguma, pede confirmação
  const pedirTroca = () => (alterado ? setConfirmarTroca(true) : onTrocarModelo())

  // As partes no formato da API; com algum campo vazio, marca os erros e
  // devolve null
  const montarPartes = (): ParteEnviada[] | null => {
    const locais: Record<string, ErrosDaParte> = {}
    const enviadas = partes.map((parte) => {
      const valor = valorEnviado(parte)
      if (!parte.name.trim()) locais[parte.chave] = { ...locais[parte.chave], name: "Dê um nome à parte." }
      if (valor === null) locais[parte.chave] = { ...locais[parte.chave], value: "Informe um valor." }
      return {
        name: parte.name.trim(),
        rule_type: parte.rule_type,
        value: valor ?? "",
        reference: parte.reference,
        ...destinoEnviado(parte.destino),
      }
    })
    setErros(locais)
    return Object.keys(locais).length ? null : enviadas
  }

  // SALARIO-08 a SALARIO-11: os erros de cada parte vêm na posição dela,
  // `{"parts": [{}, {"value": [...]}]}`; os demais vão ao tratarErro
  const mostrarErros = (erro: unknown, chaves: string[]) => {
    const resposta = (erro as { response?: { status?: number; data?: unknown } } | null)?.response
    const dados = resposta?.data as Record<string, unknown> | undefined
    if (resposta?.status === 400 && dados && Array.isArray(dados.parts)) {
      const porParte: Record<string, ErrosDaParte> = {}
      ;(dados.parts as Record<string, unknown>[]).forEach((errosDaParte, i) => {
        if (!errosDaParte || typeof errosDaParte !== "object" || !chaves[i]) return
        const primeira = (campo: string) => {
          const valor = errosDaParte[campo]
          return Array.isArray(valor) ? String(valor[0]) : typeof valor === "string" ? valor : undefined
        }
        const marcados: ErrosDaParte = {
          name: primeira("name"),
          value: primeira("value") ?? primeira("rule_type"),
          destination: primeira("account") ?? primeira("goal") ?? primeira("destination_type"),
        }
        if (marcados.name || marcados.value || marcados.destination) porParte[chaves[i]] = marcados
      })
      setErros(porParte)
      const { parts: _partes, ...resto } = dados
      void _partes
      if (Object.keys(resto).length) {
        tratarErro({ response: { status: 400, data: resto } })
      } else if (!Object.keys(porParte).length) {
        tratarErro(erro)
      }
      return
    }
    tratarErro(erro, { mensagemPadrao: "Erro ao salvar o plano." })
  }

  const salvar = async () => {
    const enviadas = montarPartes()
    if (!enviadas) return
    const chaves = partes.map((p) => p.chave)
    setSalvando(true)
    try {
      const plano = await salarioService.salvarPlano({ parts: enviadas, salary_categories: categoriasDoSalario })
      toast.success("Plano salvo.")
      onSalvo(plano)
    } catch (erro) {
      mostrarErros(erro, chaves)
    } finally {
      setSalvando(false)
    }
  }

  const opcoesDeDestino = (parte: Rascunho) => {
    const conhecido =
      parte.destino === "" ||
      parte.destino === CONTA_DO_SALARIO ||
      contasDeDestino.some((c) => `ACCOUNT:${c.id}` === parte.destino) ||
      metasDeDestino.some((m) => `GOAL:${m.id}` === parte.destino)
    return { conhecido, nome: parte.inicial?.destination_name ?? "Destino indisponível" }
  }

  // "Soma: 80% · Livre: 20%"; com partes fixas, a soma em R$ entra junto
  const fixos = barra.somaDosFixos > 0 ? ` + ${formatarMoeda(deCentavos(barra.somaDosFixos))}` : ""
  const resumoDaSoma = acimaDe100
    ? `Soma: ${textoDoPercentual(barra.somaDosPercentuais)}${fixos} · Passa de 100%`
    : temFixas && !base
      ? `Soma: ${textoDoPercentual(barra.somaDosPercentuais)}${fixos}`
      : `Soma: ${textoDoPercentual(barra.somaDosPercentuais)}${fixos} · Livre: ${textoDoPercentual(barra.livre)}`

  return (
    <div role="region" aria-label="Plano de divisão" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">
          As partes são atendidas na ordem da lista. O que sobrar fica livre na conta do salário.
        </p>
        <Button variant="ghost" className="h-10 shrink-0 rounded-xl px-3 self-start" onClick={pedirTroca}>
          <Shuffle aria-hidden /> Trocar de modelo
        </Button>
      </div>

      <div className="space-y-2">
        <BarraDaDivisao barra={barra} />
        {baseDaBarra ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {textoDaBase(baseDaBarra)}
            {temFixas && ". Os percentuais valem sobre o que sobra depois das partes em R$."}
          </p>
        ) : barra.fixasForaDaBarra > 0 ? (
          <p className="text-xs text-muted-foreground">Partes em R$ entram na barra quando você simula um valor.</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="valor-simulado-no-editor" className="text-sm text-muted-foreground">
            Simular com
          </label>
          <MoneyInput
            id="valor-simulado-no-editor"
            aria-label="Valor do salário"
            value={valorSimulado}
            placeholder="R$ 0,00"
            className="h-10 w-40 rounded-xl tabular-nums"
            onValueChange={(valor) => onValorSimulado(valor ?? "")}
          />
        </div>
      </div>

      {partes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma parte ainda. Adicione a primeira parte do seu plano.
        </p>
      ) : (
        <ol className="divide-y divide-border border-y border-border" aria-label="Partes do plano">
          {partes.map((parte, indice) => {
            const rotulo = parte.name.trim() || `parte ${indice + 1}`
            const historico = porcentagemNoHistorico(parte.reference, referencias)
            const pedido = pedidoDaMeta(parte, metas)
            const errosDaParte = erros[parte.chave] ?? {}
            const destino = opcoesDeDestino(parte)
            const fatia = barra.fatias[indice]
            return (
              <li key={parte.chave} aria-label={rotulo} className="flex gap-2 py-3">
                <div className="flex shrink-0 flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    aria-label={`Subir ${rotulo}`}
                    disabled={indice === 0}
                    onClick={() => mover(indice, -1)}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    aria-label={`Descer ${rotulo}`}
                    disabled={indice === partes.length - 1}
                    onClick={() => mover(indice, 1)}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <PontoDaCor className={corDaParte(indice)} />
                    <Input
                      aria-label={`Nome da parte ${indice + 1}`}
                      value={parte.name}
                      maxLength={60}
                      placeholder="Nome da parte"
                      className="h-10 rounded-xl font-medium"
                      onChange={(e) => alterar(parte.chave, { name: e.target.value })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${rotulo}`}
                      onClick={() => remover(parte.chave)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2 pl-[18px] sm:flex-row pr-12">
                    <div className="flex shrink-0 gap-2">
                      <div className="flex h-10 shrink-0 rounded-xl border border-border p-0.5" role="group" aria-label={`Regra de ${rotulo}`}>
                        {(["PERCENT", "FIXED"] as const).map((regra) => (
                          <button
                            key={regra}
                            type="button"
                            aria-pressed={parte.rule_type === regra}
                            className={cn(
                              "min-w-10 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              parte.rule_type === regra ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                            )}
                            onClick={() => parte.rule_type !== regra && alterar(parte.chave, { rule_type: regra, valor: "" })}
                          >
                            {regra === "PERCENT" ? "%" : "R$"}
                          </button>
                        ))}
                      </div>
                      {parte.rule_type === "PERCENT" ? (
                        <Input
                          aria-label={`Percentual de ${rotulo}`}
                          inputMode="decimal"
                          value={parte.valor}
                          placeholder="0"
                          className="h-10 w-24 rounded-xl tabular-nums"
                          onChange={(e) => alterar(parte.chave, { valor: e.target.value.replace(/[^\d,.]/g, "") })}
                        />
                      ) : (
                        <MoneyInput
                          aria-label={`Valor de ${rotulo}`}
                          value={parte.valor}
                          placeholder="R$ 0,00"
                          className="h-10 w-32 rounded-xl tabular-nums"
                          onValueChange={(valor) => alterar(parte.chave, { valor: valor ?? "" })}
                        />
                      )}
                    </div>

                    <Select value={parte.destino} onValueChange={(valor) => alterar(parte.chave, { destino: valor })}>
                      <SelectTrigger aria-label={`Destino de ${rotulo}`} className="h-10 min-w-0 flex-1 rounded-xl">
                        <SelectValue placeholder="Escolha o destino" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value={CONTA_DO_SALARIO}>Fica na conta do salário</SelectItem>
                        {!destino.conhecido && (
                          <SelectItem value={parte.destino} disabled>
                            {destino.nome}
                          </SelectItem>
                        )}
                        {contasDeDestino.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Contas</SelectLabel>
                            {contasDeDestino.map((conta) => (
                              <SelectItem key={conta.id} value={`ACCOUNT:${conta.id}`}>
                                {conta.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {metasDeDestino.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Metas</SelectLabel>
                            {metasDeDestino.map((meta) => (
                              <SelectItem key={meta.id} value={`GOAL:${meta.id}`}>
                                Meta: {meta.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-0.5 pl-[18px] text-xs empty:hidden">
                    {fatia?.centavos != null &&
                      (fatia.reduzida ? (
                        <p className="font-medium text-amber-700 dark:text-amber-400 tabular-nums">
                          Reduzida para {formatarMoeda(deCentavos(fatia.centavos))}
                        </p>
                      ) : parte.rule_type === "PERCENT" ? (
                        <p className="font-medium text-foreground tabular-nums">Recebe {formatarMoeda(deCentavos(fatia.centavos))}</p>
                      ) : null)}
                    {errosDaParte.name && <p className="font-medium text-destructive">{errosDaParte.name}</p>}
                    {errosDaParte.value && <p className="font-medium text-destructive">{errosDaParte.value}</p>}
                    {errosDaParte.destination && <p className="font-medium text-destructive">{errosDaParte.destination}</p>}
                    {!parte.destino && !errosDaParte.destination && (
                      <p className="font-medium text-amber-700 dark:text-amber-400">Escolha o destino antes de dividir.</p>
                    )}
                    {historico && <p className="text-muted-foreground">{historico} no seu histórico</p>}
                    {pedido && (
                      <p className="text-muted-foreground tabular-nums">
                        A meta pede {formatarMoeda(pedido.mensal)} por mês até {format(lerData(pedido.data), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" className="h-10 rounded-xl px-4" onClick={adicionar}>
          <Plus aria-hidden /> Adicionar parte
        </Button>
        <p aria-live="polite" className={cn("text-sm tabular-nums", acimaDe100 ? "font-medium text-destructive" : "text-muted-foreground")}>
          {resumoDaSoma}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        {onCancelar && (
          <Button variant="ghost" className="h-10 rounded-xl px-4" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
        )}
        <Button className="h-10 rounded-xl px-5 font-semibold" onClick={salvar} loading={salvando}>
          {!salvando && <Save aria-hidden />}
          Salvar plano
        </Button>
      </div>

      <AlertDialog open={confirmarTroca} onOpenChange={setConfirmarTroca}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar de modelo?</AlertDialogTitle>
            <AlertDialogDescription>As mudanças que você fez nas partes serão descartadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-xl">Continuar editando</AlertDialogCancel>
            <AlertDialogAction className="h-10 rounded-xl" onClick={onTrocarModelo}>
              Trocar de modelo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
