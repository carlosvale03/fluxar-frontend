"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { AlertTriangle, ArrowRight, CheckCircle2, Scissors, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MoneyInput } from "@/components/ui/money-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { lerData } from "@/lib/datas"
import { deCentavos, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { novoIdentificador } from "@/lib/identificador"
import { quantidadeDeTransacoes, resumoDoDesconto } from "@/lib/salario"
import { cn } from "@/lib/utils"
import { salarioService } from "@/services/salario"
import type {
  AjustesDaDivisao,
  DivisaoDoSalario,
  ItemDaDivisaoCalculada,
  RevisaoDaDivisao as Revisao,
  SaidaDoSalario,
  SaidasDaDivisao,
} from "@/types/salario"

const dataCurta = (data: string | null | undefined) => (data ? format(lerData(data), "dd/MM/yyyy") : "")

// SALARIO-71: o Select do Radix não aceita valor vazio
const NAO_DESCONTAR = "nao-descontar"
// Saídas visíveis antes de "Mostrar todas"
const SAIDAS_VISIVEIS = 6
// Espera entre a troca da parte de uma saída e o novo cálculo
const ESPERA_DO_RECALCULO = 300
// SALARIO-73: a divisão sem transferências, só com as saídas descontadas
const SAIDAS_COBRIRAM = "Nenhuma transferência a fazer: as saídas já cobriram as partes."
// SALARIO-74: a recusa do backend quando o total da revisão mudou
const DIVISAO_MUDOU = "A divisão mudou desde a revisão. Confira de novo antes de gerar."

interface Pedido {
  ajustes: AjustesDaDivisao
  escolhas: SaidasDaDivisao
}

const VAZIO: Pedido = { ajustes: {}, escolhas: {} }

// "Despesa", "Transferência para Reserva", "Aporte em Viagem", "Fatura do
// Nubank". A API não diz se a transferência foi um aporte: é aporte quando o
// destino tem o nome de uma meta do plano
function tipoDaSaida(saida: SaidaDoSalario, itens: ItemDaDivisaoCalculada[]): string {
  const destino = saida.destination_name
  switch (saida.type) {
    case "EXPENSE":
      return saida.category_name ? `Saída (${saida.category_name})` : "Saída"
    case "TRANSFER_OUT":
      if (!destino) return "Transferência"
      return itens.some((item) => item.destination_type === "GOAL" && item.destination_name === destino)
        ? `Aporte em ${destino}`
        : `Transferência para ${destino}`
    case "INVOICE_PAYMENT":
      return destino ? `Fatura do ${destino}` : "Pagamento de fatura"
    case "CREDIT_CARD":
      return destino ? `Compra no ${destino}` : "Compra no cartão"
    default:
      return "Saída"
  }
}

const sugestoesDe = (saidas: SaidaDoSalario[]): SaidasDaDivisao =>
  Object.fromEntries(saidas.map((saida) => [saida.id, saida.suggested_part_id]))

interface RevisaoDaDivisaoProps {
  // Recebimento a dividir; null fecha a revisão
  recebimentoId: string | null
  onOpenChange: (open: boolean) => void
  onGerada: (divisao: DivisaoDoSalario) => void
  onDesfazer: (divisao: DivisaoDoSalario) => void
}

// SALARIO-29 a SALARIO-31 e SALARIO-44: a revisão de cada transação, o ajuste
// por parte, a confirmação forte e, no fim, as transações criadas.
// SALARIO-71: as saídas da conta do salário desde o recebimento, cada uma
// descontada da parte escolhida
export function RevisaoDaDivisao({ recebimentoId, onOpenChange, onGerada, onDesfazer }: RevisaoDaDivisaoProps) {
  const open = recebimentoId !== null
  const [revisao, setRevisao] = useState<Revisao | null>(null)
  // A parte escolhida para cada saída, como aparece nos Selects
  const [escolhas, setEscolhas] = useState<SaidasDaDivisao>({})
  // Texto em edição de cada ajuste, por id da parte
  const [digitados, setDigitados] = useState<Record<string, string>>({})
  const [confirmado, setConfirmado] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [resultado, setResultado] = useState<DivisaoDoSalario | null>(null)
  const [todasAsSaidas, setTodasAsSaidas] = useState(false)

  // SALARIO-37, SALARIO-79 e AD-007: uma chave nova a cada abertura da
  // revisão, reenviada em toda nova tentativa até o sucesso; fechar e abrir
  // de novo gera outra, e a chave de uma divisão desfeita recebe 409
  const chaveDaTentativa = useRef("")
  // Ajustes e saídas do último pedido e os da revisão na tela; a geração
  // envia os da tela, iguais aos do pedido fora do recálculo
  const pedido = useRef<Pedido>(VAZIO)
  const aplicado = useRef<Pedido>(VAZIO)
  // Cada cálculo ganha um número, e só a resposta do último entra na tela
  const sequencia = useRef(0)
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // O recebimento aberto agora: a resposta da geração de outro não entra na tela
  const recebimentoAberto = useRef<string | null>(recebimentoId)

  const aplicar = (nova: Revisao, valores: Pedido) => {
    pedido.current = valores
    aplicado.current = valores
    setEscolhas(valores.escolhas)
    setRevisao(nova)
  }

  // A primeira prévia vem sem desconto e com a parte sugerida de cada saída
  // (SALARIO-65); havendo saídas, a revisão pede de novo com as sugestões
  async function carregar(id: string) {
    const numero = ++sequencia.current
    let primeira: Revisao
    try {
      primeira = await salarioService.revisar(id)
    } catch (erro) {
      if (numero !== sequencia.current) return
      tratarErro(erro, { mensagemPadrao: "Não foi possível montar a revisão da divisão. Tente de novo." })
      onOpenChange(false)
      return
    }
    if (numero !== sequencia.current) return
    const saidas = primeira.outflows ?? []
    if (!saidas.length) {
      aplicar(primeira, VAZIO)
      return
    }
    const sugeridas = sugestoesDe(saidas)
    pedido.current = { ajustes: {}, escolhas: sugeridas }
    setEscolhas(sugeridas)
    try {
      const descontada = await salarioService.revisar(id, undefined, sugeridas)
      if (numero === sequencia.current) aplicar(descontada, { ajustes: {}, escolhas: sugeridas })
    } catch (erro) {
      if (numero !== sequencia.current) return
      tratarErro(erro, { mensagemPadrao: "Não foi possível descontar as saídas da divisão. Escolha as partes de novo." })
      // Fica a prévia sem desconto, com todas as saídas em "Não descontar"
      aplicar(primeira, { ajustes: {}, escolhas: Object.fromEntries(saidas.map((saida) => [saida.id, null])) })
    }
  }

  useEffect(() => {
    recebimentoAberto.current = recebimentoId
    if (!recebimentoId) return
    chaveDaTentativa.current = novoIdentificador()
    clearTimeout(espera.current)
    pedido.current = VAZIO
    aplicado.current = VAZIO
    setRevisao(null)
    setEscolhas({})
    setDigitados({})
    setConfirmado(false)
    setRecalculando(false)
    setResultado(null)
    setTodasAsSaidas(false)
    void carregar(recebimentoId)
    // Só quando a revisão abre para um recebimento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recebimentoId])

  // Fechada a revisão, nenhuma resposta pendente entra mais na tela
  useEffect(() => {
    if (open) return
    sequencia.current += 1
    clearTimeout(espera.current)
  }, [open])

  useEffect(() => () => clearTimeout(espera.current), [])

  // SALARIO-30 e SALARIO-71: pede a prévia com os ajustes e as saídas do
  // pedido; a resposta antiga é descartada, e o erro volta ao que está na tela
  const recalcular = (trocas: Partial<Pedido>, atraso = 0) =>
    new Promise<void>((resolve) => {
      if (!recebimentoId) return resolve()
      const id = recebimentoId
      const valores = { ...pedido.current, ...trocas }
      pedido.current = valores
      const numero = ++sequencia.current
      clearTimeout(espera.current)
      setRecalculando(true)
      espera.current = setTimeout(async () => {
        try {
          const nova = await salarioService.revisar(id, valores.ajustes, valores.escolhas)
          if (numero === sequencia.current) aplicar(nova, valores)
        } catch (erro) {
          if (numero === sequencia.current) {
            tratarErro(erro, { mensagemPadrao: "Não foi possível recalcular a divisão. Os valores anteriores continuam na tela." })
            pedido.current = aplicado.current
            setEscolhas(aplicado.current.escolhas)
          }
        } finally {
          if (numero === sequencia.current) setRecalculando(false)
          resolve()
        }
      }, atraso)
    })

  // SALARIO-30: o ajuste vale só nesta divisão; o backend recalcula o total,
  // o livre e as partes reduzidas
  const aplicarAjuste = async (item: ItemDaDivisaoCalculada) => {
    if (!recebimentoId || !item.part_id) return
    const parte = item.part_id
    const digitado = digitados[parte]
    const esquecer = () =>
      setDigitados(({ [parte]: _removido, ...resto }) => {
        void _removido
        return resto
      })
    if (digitado === undefined) return
    const ajustada = parte in pedido.current.ajustes
    if (!digitado) {
      // Campo limpo: o ajuste sai do pedido, e a parte volta ao valor do plano
      esquecer()
      if (ajustada) {
        const { [parte]: _removido, ...resto } = pedido.current.ajustes
        void _removido
        await recalcular({ ajustes: resto })
      }
      return
    }
    if (digitado === item.amount) {
      esquecer()
      return
    }
    await recalcular({ ajustes: { ...pedido.current.ajustes, [parte]: digitado } })
    esquecer()
  }

  // SALARIO-71: trocar a parte de uma saída recalcula a revisão
  const escolherParte = (saidaId: string, valor: string) => {
    const novas = { ...pedido.current.escolhas, [saidaId]: valor === NAO_DESCONTAR ? null : valor }
    setEscolhas(novas)
    void recalcular({ escolhas: novas }, ESPERA_DO_RECALCULO)
  }

  const gerar = async () => {
    if (!recebimentoId) return
    const id = recebimentoId
    setGerando(true)
    try {
      const { ajustes, escolhas: saidas } = aplicado.current
      const divisao = await salarioService.gerar(id, chaveDaTentativa.current, ajustes, saidas, revisao?.total)
      // Com outro recebimento aberto, só as listas da página são relidas
      if (recebimentoAberto.current === id) {
        setResultado(divisao)
        toast.success("Divisão gerada.")
      }
      onGerada(divisao)
    } catch (erro) {
      // A chave continua a mesma: o reenvio depois de um erro de rede recebe
      // a divisão já gravada, sem gerar em dobro
      if (recebimentoAberto.current !== id) return
      tratarErro(erro, { mensagemPadrao: "Não foi possível gerar os lançamentos da divisão. Tente de novo." })
      // SALARIO-74: a divisão mudou desde a revisão (uma saída nova, o plano
      // editado em outra aba); a revisão é refeita com as mesmas escolhas e
      // pede a marcação de novo
      const resposta = (erro as { response?: { status?: number; data?: { detail?: unknown } } } | null)?.response
      if (resposta?.status === 400 && resposta.data?.detail === DIVISAO_MUDOU) {
        setConfirmado(false)
        void recalcular({})
      }
    } finally {
      setGerando(false)
    }
  }

  const transacoes = revisao?.items.filter((item) => item.generates_transaction) ?? []
  const ficam = revisao?.items.filter((item) => !item.generates_transaction) ?? []
  const semDestino = transacoes.some((item) => !item.destination_type)
  const saidas = revisao?.outflows ?? []
  const saidasVisiveis = todasAsSaidas ? saidas : saidas.slice(0, SAIDAS_VISIVEIS)
  // SALARIO-72: o já gasto é a soma das saídas descontadas
  const jaGasto = saidas.reduce((soma, saida) => soma + (saida.part_id ? paraCentavos(saida.amount) : 0), 0)
  // SALARIO-73: sem transação, mas com saídas descontadas, a divisão ainda é
  // gravada, para registrar o desconto
  const soSaidas = transacoes.length === 0 && saidas.some((saida) => saida.part_id)
  const confirmacao = soSaidas ? "Confirmo a divisão com as saídas descontadas" : "Confirmo que fiz essas transferências no banco"

  const escolhaDe = (saida: SaidaDoSalario) => (saida.id in escolhas ? escolhas[saida.id] : saida.part_id)

  const linhaDaSaida = (saida: SaidaDoSalario) => {
    const escolhida = escolhaDe(saida)
    const descricao = saida.description || "Saída"
    // As partes que recebem valor, mais a escolhida, para o Select mostrar o nome
    const partes = (revisao?.items ?? []).filter(
      (item) => item.part_id && (paraCentavos(item.amount) > 0 || item.part_id === escolhida),
    )
    const sugerida = escolhida !== null && escolhida === saida.suggested_part_id
    return (
      <li key={saida.id} aria-label={descricao} className="p-3 space-y-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={descricao}>{descricao}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {format(lerData(saida.date), "dd/MM")} · {tipoDaSaida(saida, revisao?.items ?? [])}
            </p>
          </div>
          <p className="value-m">{formatarMoeda(saida.amount)}</p>
        </div>
        <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
          <Select
            value={escolhida ?? NAO_DESCONTAR}
            onValueChange={(valor) => escolherParte(saida.id, valor)}
            disabled={gerando}
          >
            <SelectTrigger aria-label={`Parte de ${descricao}`} className="h-10 min-w-0 flex-1 rounded-md text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {partes.map((item) => (
                <SelectItem key={item.part_id} value={item.part_id as string}>
                  {item.name}
                </SelectItem>
              ))}
              <SelectItem value={NAO_DESCONTAR}>Não descontar</SelectItem>
            </SelectContent>
          </Select>
          {sugerida && <span className="text-xs font-medium text-muted-foreground">Sugerida</span>}
        </div>
      </li>
    )
  }

  const linhaDoItem = (item: ItemDaDivisaoCalculada, gera: boolean) => {
    const id = item.part_id
    const gasto = paraCentavos(item.spent)
    const passou = paraCentavos(item.exceeded)
    // As partes com destino numa conta ou numa meta transferem o que sobra
    // do valor calculado depois das saídas (SALARIO-66)
    const transfere = item.destination_type === "ACCOUNT" || item.destination_type === "GOAL"
    return (
      <li key={`${item.name}-${id}`} aria-label={item.name} className="space-y-2 rounded-md border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {item.name}
              {item.reduced && (
                <Badge variant="warning">
                  Reduzida
                </Badge>
              )}
              {item.adjusted && (
                <Badge variant="secondary">
                  Ajustada
                </Badge>
              )}
            </p>
            {gera ? (
              <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <span>{item.origin_account?.name ?? revisao?.receipt.account_name}</span>
                <ArrowRight aria-hidden="true" className="h-3 w-3" />
                <span className={item.destination_name ? "" : "font-medium text-destructive"}>
                  {item.destination_name ?? "Sem destino"}
                </span>
                <span aria-hidden="true" className="mx-1">·</span>
                <span className="font-mono tabular-nums">{dataCurta(revisao?.date)}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {item.destination_type === "SALARY_ACCOUNT" || !item.destination_type
                  ? "Fica na conta do salário"
                  : `${item.destination_name ?? ""}: não gera lançamento`}
              </p>
            )}
            {(transfere || gasto > 0) && (
              <p className="text-xs text-muted-foreground tabular-nums">
                Calculado {formatarMoeda(item.amount)}
                {gasto > 0 && ` · Já gasto ${formatarMoeda(item.spent)}`}
              </p>
            )}
          </div>
          {/* Só a parte que gera transação transfere; a que fica na conta mostra o que resta dela depois dos gastos */}
          <p className="text-right whitespace-nowrap">
            <span className="label block text-muted-foreground">
              {gera ? "Transferir" : gasto > 0 ? "Resta" : "Fica na conta"}
            </span>{" "}
            <span className="value-m">
              {formatarMoeda(gera || gasto > 0 ? (item.transfer ?? item.amount) : item.amount)}
            </span>
          </p>
        </div>
        {passou > 0 && (
          <p role="status" className="flex items-center gap-1.5 rounded-r-md border border-border border-l-[3px] border-l-warn bg-card px-3 py-2 text-xs font-medium text-warn">
            <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            Passou {formatarMoeda(item.exceeded)} do valor da parte
          </p>
        )}
        {id && (
          <div className="space-y-1">
            <MoneyInput
              aria-label={`Ajustar ${item.name}`}
              aria-describedby={saidas.length ? `ajuste-de-${id}` : undefined}
              value={digitados[id] ?? item.amount}
              className="h-9 text-sm"
              disabled={recalculando || gerando}
              onValueChange={(valor) => setDigitados((atuais) => ({ ...atuais, [id]: valor ?? "" }))}
              onBlur={() => void aplicarAjuste(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
            />
            {/* SALARIO-30 e SALARIO-66: o ajuste troca o valor da parte, e as saídas saem dele depois */}
            {saidas.length > 0 && (
              <p id={`ajuste-de-${id}`} className="text-xs text-muted-foreground">
                Valor da parte antes de descontar as saídas
              </p>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    // Enquanto gera, a janela não fecha, como no desfazer
    <Dialog open={open} onOpenChange={(aberta) => !gerando && onOpenChange(aberta)}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[680px]">
        {/* Rolagem nativa: o ScrollArea do Radix põe o conteúdo num display: table, que cresce até o texto mais longo e corta a janela */}
        <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <div className="space-y-6 p-6">
            <DialogHeader className="pr-8">
              <div className="flex items-start gap-3">
                {resultado ? (
                  <CheckCircle2 aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-inflow" />
                ) : (
                  <Scissors aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-gold-line" />
                )}
                <div className="min-w-0 space-y-0.5 text-left">
                  <DialogTitle>
                    {resultado ? "Divisão gerada" : "Revisar a divisão"}
                  </DialogTitle>
                  <DialogDescription className="[overflow-wrap:anywhere]">
                    {resultado
                      ? `${resultado.receipt.description ?? "Salário"} de ${formatarMoeda(resultado.receipt.amount)}`
                      : revisao
                        ? `${revisao.receipt.description} de ${formatarMoeda(revisao.receipt.amount)}, recebido em ${dataCurta(revisao.receipt.date)}`
                        : "Calculando pelo seu plano"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {resultado ? (
              <ResultadoDaDivisao divisao={resultado} onDesfazer={() => onDesfazer(resultado)} onFechar={() => onOpenChange(false)} />
            ) : !revisao ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : (
              <>
                <section aria-labelledby="saidas-desde-o-salario" className="space-y-2">
                  <div className="space-y-0.5">
                    <h3 id="saidas-desde-o-salario" className="label text-muted-foreground">
                      Saídas desde o salário
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      O que já saiu da conta do salário desde que ele caiu. Escolha de qual parte saiu cada valor.
                    </p>
                  </div>
                  {saidas.length ? (
                    <>
                      <ul className="rounded-md border border-border divide-y divide-border" aria-label="Saídas desde o salário">
                        {saidasVisiveis.map(linhaDaSaida)}
                      </ul>
                      {saidas.length > SAIDAS_VISIVEIS && (
                        <Button
                          variant="ghost"
                          className="h-10 px-3"
                          aria-expanded={todasAsSaidas}
                          onClick={() => setTodasAsSaidas((todas) => !todas)}
                        >
                          {todasAsSaidas ? "Mostrar menos" : `Mostrar todas (${saidas.length})`}
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma saída desde o salário.</p>
                  )}
                </section>

                <div className="space-y-2">
                  <h3 className="label text-muted-foreground">
                    Lançamentos que serão criados
                  </h3>
                  {transacoes.length ? (
                    <ul className="space-y-2" aria-label="Lançamentos que serão criados">
                      {transacoes.map((item) => linhaDoItem(item, true))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{soSaidas ? SAIDAS_COBRIRAM : "Nenhuma parte do plano gera lançamento."}</p>
                  )}
                </div>

                {ficam.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="label text-muted-foreground">Ficam na conta do salário</h3>
                    <ul className="space-y-2" aria-label="Partes que ficam na conta do salário">
                      {ficam.map((item) => linhaDoItem(item, false))}
                    </ul>
                  </div>
                )}

                <div aria-live="polite" className="space-y-1 rounded-md border border-border bg-elevated p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Recebido</span>
                    <span className="value-m" data-testid="recebido-da-divisao">{formatarMoeda(revisao.receipt.amount)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Já gasto</span>
                    <span className="value-m" data-testid="gasto-da-divisao">{formatarMoeda(deCentavos(jaGasto))}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Total dos lançamentos</span>
                    <span className="value-m" data-testid="total-da-divisao">{formatarMoeda(revisao.total)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Fica livre na conta do salário</span>
                    {/* O livre fica negativo quando as saídas passam do que sobra; mostrado como vem */}
                    <span className={cn("value-m", paraCentavos(revisao.free) < 0 && "text-destructive")} data-testid="livre-da-divisao">
                      {formatarMoeda(revisao.free)}
                    </span>
                  </div>
                </div>

                {semDestino && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    Escolha o destino de todas as partes no plano antes de gerar.
                  </p>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border-strong p-4 transition-colors duration-fast hover:bg-elevated">
                  <Checkbox
                    checked={confirmado}
                    onCheckedChange={(marcado) => setConfirmado(marcado === true)}
                    aria-label={confirmacao}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium">{confirmacao}</span>
                </label>

                <Button
                  className="h-11 w-full"
                  disabled={!confirmado || (transacoes.length === 0 && !soSaidas) || semDestino || recalculando}
                  loading={gerando}
                  onClick={gerar}
                >
                  {soSaidas
                    ? "Gerar a divisão sem transferências"
                    : `Gerar ${quantidadeDeTransacoes(transacoes.length)} de ${formatarMoeda(revisao.total)}`}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// SALARIO-44: as transações criadas e a opção de desfazer
function ResultadoDaDivisao({
  divisao,
  onDesfazer,
  onFechar,
}: {
  divisao: DivisaoDoSalario
  onDesfazer: () => void
  onFechar: () => void
}) {
  const desconto = resumoDoDesconto(divisao.outflows)
  return (
    <div className="space-y-4">
      {/* SALARIO-73: só as saídas foram descontadas, sem transação */}
      {divisao.transactions.length === 0 ? (
        <p className="text-sm font-medium">{SAIDAS_COBRIRAM}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border" aria-label="Lançamentos criados">
          {divisao.transactions.map((transacao) => (
            <li
              key={transacao.transfer_id ?? transacao.part_name}
              className="flex items-start justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {transacao.kind === "GOAL_DEPOSIT" ? "Aporte" : "Transferência"}: {transacao.part_name}
                </p>
                <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <span>{transacao.origin_account.name}</span>
                  <ArrowRight aria-hidden="true" className="h-3 w-3" />
                  <span>{transacao.destination_name}</span>
                  <span aria-hidden="true" className="mx-1">·</span>
                  <span className="font-mono tabular-nums">{dataCurta(transacao.date)}</span>
                </p>
              </div>
              <p className="value-m">{formatarMoeda(transacao.amount)}</p>
            </li>
          ))}
        </ul>
      )}
      {desconto && <p className="text-sm text-muted-foreground tabular-nums">{desconto}.</p>}
      <p className="text-sm text-muted-foreground">
        Ficou livre na conta do salário:{" "}
        <span className={cn("value-m", paraCentavos(divisao.free) < 0 ? "text-destructive" : "text-foreground")}>
          {formatarMoeda(divisao.free)}
        </span>
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {!divisao.undone_at && (
          <Button variant="outline" onClick={onDesfazer}>
            <Undo2 aria-hidden="true" /> Desfazer divisão
          </Button>
        )}
        <Button onClick={onFechar}>
          Concluir
        </Button>
      </div>
      {!divisao.undone_at && (
        <p className="text-xs text-muted-foreground">
          Você pode desfazer até {dataCurta(divisao.can_undo_until)}.
        </p>
      )}
    </div>
  )
}
