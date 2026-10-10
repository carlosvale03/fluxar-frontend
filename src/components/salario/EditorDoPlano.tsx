"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { ArrowDown, ArrowUp, Calculator, Loader2, Plus, Save, Shuffle, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { deCentavos, formatarMoeda, lerValorDigitado, maiorQueZero, paraCentavos } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { percentualParaCampo, porcentagemNoHistorico } from "@/lib/salario"
import { cn } from "@/lib/utils"
import { salarioService } from "@/services/salario"
import { AccountType, type Account } from "@/types/accounts"
import type { Category } from "@/types/categories"
import type { Goal } from "@/types/goals"
import type {
  ParteEnviada,
  PlanoDoSalario,
  ReferenciaDaParte,
  ReferenciasDoSalario,
  RegraDaParte,
  Simulacao,
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
  categoriasIniciais: string[]
  contas: Account[]
  metas: Goal[]
  // Categorias de receita, raízes com as subcategorias
  categorias: Category[]
  referencias: ReferenciasDoSalario | null
  onSalvo: (plano: PlanoDoSalario) => void
  onTrocarModelo: () => void
}

// SALARIO-04 a SALARIO-07, SALARIO-12 a SALARIO-14, SALARIO-54 e SALARIO-55:
// as partes em ordem de prioridade, com regra, valor e destino; as categorias
// que contam como salário; a simulação com um valor digitado.
export function EditorDoPlano({
  partesIniciais,
  categoriasIniciais,
  contas,
  metas,
  categorias,
  referencias,
  onSalvo,
  onTrocarModelo,
}: EditorDoPlanoProps) {
  const [partes, setPartes] = useState<Rascunho[]>(() => partesIniciais.map(rascunhoDe))
  const [categoriasDoSalario, setCategoriasDoSalario] = useState<string[]>(categoriasIniciais)
  const [erros, setErros] = useState<Record<string, ErrosDaParte>>({})
  const [salvando, setSalvando] = useState(false)
  const [valorSimulado, setValorSimulado] = useState("")
  const [simulacao, setSimulacao] = useState<Simulacao | null>(null)
  const [simulando, setSimulando] = useState(false)

  // SALARIO-05: contas ativas que não são cofrinho e metas ativas
  const contasDeDestino = useMemo(
    () => contas.filter((c) => c.is_active && c.type !== AccountType.PIGGY_BANK),
    [contas],
  )
  const metasDeDestino = useMemo(() => metas.filter((m) => m.is_active !== false), [metas])

  const somaDosPercentuais = partes
    .filter((p) => p.rule_type === "PERCENT")
    .reduce((soma, p) => soma + (paraCentavos(lerValorDigitado(p.valor) ?? "0") || 0), 0)

  const alterar = (chave: string, mudanca: Partial<Rascunho>) => {
    setPartes((atuais) => atuais.map((p) => (p.chave === chave ? { ...p, ...mudanca } : p)))
    setErros((atuais) => {
      if (!atuais[chave]) return atuais
      const { [chave]: _removido, ...resto } = atuais
      void _removido
      return resto
    })
    setSimulacao(null)
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
    setSimulacao(null)
  }

  const remover = (chave: string) => {
    setPartes((atuais) => atuais.filter((p) => p.chave !== chave))
    setSimulacao(null)
  }

  const adicionar = () => {
    setPartes((atuais) => [
      ...atuais,
      { chave: novaChave(), name: "", rule_type: "PERCENT", valor: "", destino: "", reference: "", inicial: null },
    ])
    setSimulacao(null)
  }

  const alternarCategoria = (id: string, marcada: boolean) => {
    setCategoriasDoSalario((atuais) => (marcada ? [...atuais, id] : atuais.filter((c) => c !== id)))
  }

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

  // SALARIO-13: quanto vai para cada parte e quanto fica livre, sem gravar nada
  const simular = async () => {
    if (!maiorQueZero(valorSimulado)) {
      toast.error("Digite o valor do salário para simular.")
      return
    }
    const enviadas = montarPartes()
    if (!enviadas) return
    setSimulando(true)
    try {
      setSimulacao(await salarioService.simular(valorSimulado, enviadas))
    } catch (erro) {
      mostrarErros(erro, partes.map((p) => p.chave))
    } finally {
      setSimulando(false)
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

  return (
    <section aria-label="Plano de divisão" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight">Seu plano de divisão</h2>
          <p className="text-sm text-muted-foreground font-medium">
            As partes são atendidas na ordem da lista. O que sobrar fica livre na conta do salário.
          </p>
        </div>
        <Button variant="outline" className="rounded-2xl font-bold text-xs self-start sm:self-auto" onClick={onTrocarModelo}>
          <Shuffle className="mr-2 h-4 w-4" /> Trocar de modelo
        </Button>
      </div>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-[32px] overflow-hidden">
        <CardContent className="p-6 space-y-4">
          {partes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center bg-muted/10 rounded-2xl border border-dashed border-border/40">
              Nenhuma parte ainda. Adicione a primeira parte do seu plano.
            </p>
          ) : (
            <ol className="space-y-3" aria-label="Partes do plano">
              {partes.map((parte, indice) => {
                const rotulo = parte.name.trim() || `parte ${indice + 1}`
                const historico = porcentagemNoHistorico(parte.reference, referencias)
                const pedido = pedidoDaMeta(parte, metas)
                const errosDaParte = erros[parte.chave] ?? {}
                const destino = opcoesDeDestino(parte)
                return (
                  <li
                    key={parte.chave}
                    aria-label={rotulo}
                    className="p-4 rounded-2xl border border-border/40 bg-background/60 space-y-3"
                  >
                    <div className="flex flex-col lg:flex-row gap-3 lg:items-start">
                      <div className="flex lg:flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          aria-label={`Subir ${rotulo}`}
                          disabled={indice === 0}
                          onClick={() => mover(indice, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          aria-label={`Descer ${rotulo}`}
                          disabled={indice === partes.length - 1}
                          onClick={() => mover(indice, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <Input
                          aria-label={`Nome da parte ${indice + 1}`}
                          value={parte.name}
                          maxLength={60}
                          placeholder="Nome da parte"
                          className="rounded-xl h-10 font-bold"
                          onChange={(e) => alterar(parte.chave, { name: e.target.value })}
                        />
                        {errosDaParte.name && <p className="text-xs font-medium text-destructive">{errosDaParte.name}</p>}
                        {historico && (
                          <p className="text-[11px] text-muted-foreground font-medium">{historico} no seu histórico</p>
                        )}
                      </div>

                      <div className="space-y-1 lg:w-56">
                        <div className="flex gap-2">
                          <div className="flex rounded-xl border border-border/40 p-0.5 shrink-0" role="group" aria-label={`Regra de ${rotulo}`}>
                            {(["PERCENT", "FIXED"] as const).map((regra) => (
                              <button
                                key={regra}
                                type="button"
                                aria-pressed={parte.rule_type === regra}
                                className={cn(
                                  "px-2.5 h-9 rounded-lg text-xs font-black transition-colors",
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
                              className="rounded-xl h-10 font-bold"
                              onChange={(e) => alterar(parte.chave, { valor: e.target.value.replace(/[^\d,.]/g, "") })}
                            />
                          ) : (
                            <MoneyInput
                              aria-label={`Valor de ${rotulo}`}
                              value={parte.valor}
                              placeholder="R$ 0,00"
                              className="rounded-xl h-10 font-bold"
                              onValueChange={(valor) => alterar(parte.chave, { valor: valor ?? "" })}
                            />
                          )}
                        </div>
                        {errosDaParte.value && <p className="text-xs font-medium text-destructive">{errosDaParte.value}</p>}
                      </div>

                      <div className="space-y-1 lg:w-64">
                        <Select value={parte.destino} onValueChange={(valor) => alterar(parte.chave, { destino: valor })}>
                          <SelectTrigger aria-label={`Destino de ${rotulo}`} className="rounded-xl h-10 font-medium">
                            <SelectValue placeholder="Escolha o destino" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value={CONTA_DO_SALARIO} className="rounded-xl">
                              Fica na conta do salário
                            </SelectItem>
                            {!destino.conhecido && (
                              <SelectItem value={parte.destino} className="rounded-xl" disabled>
                                {destino.nome}
                              </SelectItem>
                            )}
                            {contasDeDestino.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Contas</SelectLabel>
                                {contasDeDestino.map((conta) => (
                                  <SelectItem key={conta.id} value={`ACCOUNT:${conta.id}`} className="rounded-xl">
                                    {conta.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {metasDeDestino.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Metas</SelectLabel>
                                {metasDeDestino.map((meta) => (
                                  <SelectItem key={meta.id} value={`GOAL:${meta.id}`} className="rounded-xl">
                                    Meta: {meta.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                        {errosDaParte.destination && (
                          <p className="text-xs font-medium text-destructive">{errosDaParte.destination}</p>
                        )}
                        {!parte.destino && !errosDaParte.destination && (
                          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            Escolha o destino antes de dividir.
                          </p>
                        )}
                        {pedido && (
                          <p className="text-[11px] text-muted-foreground font-medium">
                            A meta pede {formatarMoeda(pedido.mensal)} por mês até {format(lerData(pedido.data), "dd/MM/yyyy")}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive shrink-0"
                        aria-label={`Remover ${rotulo}`}
                        onClick={() => remover(parte.chave)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button variant="outline" className="rounded-2xl font-bold text-xs" onClick={adicionar}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar parte
            </Button>
            <p className={cn("text-xs font-bold", somaDosPercentuais > 10000 ? "text-destructive" : "text-muted-foreground")}>
              Soma dos percentuais: {percentualParaCampo(deCentavos(somaDosPercentuais))}%
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-[32px] overflow-hidden">
        <CardContent className="p-6 space-y-3">
          <div>
            <h3 className="text-base font-black tracking-tight">Categorias de salário</h3>
            <p className="text-xs text-muted-foreground font-medium">
              As receitas nessas categorias contam como salário e podem ser divididas.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" aria-label="Categorias de salário">
            {categorias.flatMap((categoria) => [categoria, ...(categoria.subcategories ?? [])]).map((categoria) => {
              const id = `categoria-do-salario-${categoria.id}`
              return (
                <li key={categoria.id} className={cn("flex items-center gap-2", categoria.parent && "pl-5")}>
                  <Checkbox
                    id={id}
                    checked={categoriasDoSalario.includes(categoria.id)}
                    onCheckedChange={(marcada) => alternarCategoria(categoria.id, marcada === true)}
                  />
                  <label htmlFor={id} className="text-sm font-medium cursor-pointer">
                    {categoria.name}
                  </label>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-[32px] overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-black tracking-tight">Simular a divisão</h3>
            <p className="text-xs text-muted-foreground font-medium">Veja quanto vai para cada parte. Nada é lançado.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <MoneyInput
              aria-label="Valor do salário"
              value={valorSimulado}
              placeholder="R$ 0,00"
              className="rounded-xl h-10 font-bold sm:max-w-xs"
              onValueChange={(valor) => {
                setValorSimulado(valor ?? "")
                setSimulacao(null)
              }}
            />
            <Button variant="outline" className="rounded-2xl font-bold text-xs h-10" onClick={simular} disabled={simulando}>
              {simulando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
              Simular
            </Button>
          </div>
          {simulacao && (
            <ul className="divide-y divide-border/40" aria-label="Resultado da simulação">
              {simulacao.items.map((item, i) => (
                <li key={`${item.name}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-medium">
                    {item.name}
                    {item.reduced && <span className="ml-2 text-[11px] font-bold text-amber-700 dark:text-amber-400">reduzida</span>}
                  </span>
                  <span className="font-bold">{formatarMoeda(item.amount)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-black">Fica livre na conta do salário</span>
                <span className="font-black">{formatarMoeda(simulacao.free)}</span>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="rounded-2xl font-black uppercase tracking-widest text-xs px-8 h-12 shadow-lg shadow-primary/20"
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar plano
        </Button>
      </div>
    </section>
  )
}
