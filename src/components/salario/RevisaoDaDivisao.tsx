"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { ArrowRight, CheckCircle2, Loader2, Scissors, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MoneyInput } from "@/components/ui/money-input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { lerData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { quantidadeDeTransacoes } from "@/lib/salario"
import { salarioService } from "@/services/salario"
import type { AjustesDaDivisao, DivisaoDoSalario, ItemDaDivisaoCalculada, RevisaoDaDivisao as Revisao } from "@/types/salario"

const dataCurta = (data: string | null | undefined) => (data ? format(lerData(data), "dd/MM/yyyy") : "")

interface RevisaoDaDivisaoProps {
  // Recebimento a dividir; null fecha a revisão
  recebimentoId: string | null
  onOpenChange: (open: boolean) => void
  onGerada: (divisao: DivisaoDoSalario) => void
  onDesfazer: (divisao: DivisaoDoSalario) => void
}

// SALARIO-29 a SALARIO-31 e SALARIO-44: a revisão de cada transação, o ajuste
// por parte, a confirmação forte e, no fim, as transações criadas
export function RevisaoDaDivisao({ recebimentoId, onOpenChange, onGerada, onDesfazer }: RevisaoDaDivisaoProps) {
  const open = recebimentoId !== null
  const [revisao, setRevisao] = useState<Revisao | null>(null)
  const [ajustes, setAjustes] = useState<AjustesDaDivisao>({})
  // Texto em edição de cada ajuste, por id da parte
  const [digitados, setDigitados] = useState<Record<string, string>>({})
  const [confirmado, setConfirmado] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [resultado, setResultado] = useState<DivisaoDoSalario | null>(null)

  // SALARIO-37 e AD-007: uma chave por abertura da revisão, reenviada em
  // toda nova tentativa até o sucesso; fechar e abrir de novo gera outra
  const chaveDaTentativa = useRef("")

  async function carregar(id: string) {
    try {
      setRevisao(await salarioService.revisar(id))
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao montar a revisão da divisão." })
      onOpenChange(false)
    }
  }

  useEffect(() => {
    if (!recebimentoId) return
    chaveDaTentativa.current = crypto.randomUUID()
    setRevisao(null)
    setAjustes({})
    setDigitados({})
    setConfirmado(false)
    setResultado(null)
    void carregar(recebimentoId)
    // Só quando a revisão abre para um recebimento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recebimentoId])

  // SALARIO-30: o ajuste vale só nesta divisão; o backend recalcula o total,
  // o livre e as partes reduzidas
  const aplicarAjuste = async (item: ItemDaDivisaoCalculada) => {
    if (!recebimentoId || !item.part_id) return
    const digitado = digitados[item.part_id]
    if (digitado === undefined || digitado === item.amount) return
    if (!digitado) {
      setDigitados(({ [item.part_id as string]: _removido, ...resto }) => {
        void _removido
        return resto
      })
      return
    }
    const novos = { ...ajustes, [item.part_id]: digitado }
    setRecalculando(true)
    try {
      setRevisao(await salarioService.revisar(recebimentoId, novos))
      setAjustes(novos)
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao recalcular a divisão." })
    } finally {
      setDigitados(({ [item.part_id as string]: _removido, ...resto }) => {
        void _removido
        return resto
      })
      setRecalculando(false)
    }
  }

  const gerar = async () => {
    if (!recebimentoId) return
    setGerando(true)
    try {
      const divisao = await salarioService.gerar(recebimentoId, chaveDaTentativa.current, ajustes)
      setResultado(divisao)
      toast.success("Divisão gerada.")
      onGerada(divisao)
    } catch (erro) {
      // A chave continua a mesma: o reenvio depois de um erro de rede recebe
      // a divisão já gravada, sem gerar em dobro
      tratarErro(erro, { mensagemPadrao: "Erro ao gerar as transações da divisão." })
    } finally {
      setGerando(false)
    }
  }

  const transacoes = revisao?.items.filter((item) => item.generates_transaction) ?? []
  const ficam = revisao?.items.filter((item) => !item.generates_transaction) ?? []
  const semDestino = transacoes.some((item) => !item.destination_type)

  const linhaDoItem = (item: ItemDaDivisaoCalculada, gera: boolean) => {
    const id = item.part_id
    return (
      <li key={`${item.name}-${id}`} aria-label={item.name} className="p-3 rounded-2xl border border-border/40 bg-background/60 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm flex flex-wrap items-center gap-2">
              {item.name}
              {item.reduced && (
                <Badge variant="outline" className="text-[10px] rounded-full border-amber-500/40 text-amber-700 dark:text-amber-400">
                  Reduzida
                </Badge>
              )}
              {item.adjusted && (
                <Badge variant="outline" className="text-[10px] rounded-full">
                  Ajustada
                </Badge>
              )}
            </p>
            {gera ? (
              <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-1">
                <span>{item.origin_account?.name ?? revisao?.receipt.account_name}</span>
                <ArrowRight className="h-3 w-3" />
                <span className={item.destination_name ? "" : "text-destructive font-bold"}>
                  {item.destination_name ?? "Sem destino"}
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1" />
                <span>{dataCurta(revisao?.date)}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground font-medium">
                {item.destination_type === "SALARY_ACCOUNT" || !item.destination_type
                  ? "Fica na conta do salário"
                  : `${item.destination_name ?? ""}: não gera transação`}
              </p>
            )}
          </div>
          <p className="font-black text-sm whitespace-nowrap">{formatarMoeda(item.amount)}</p>
        </div>
        {id && (
          <MoneyInput
            aria-label={`Ajustar ${item.name}`}
            value={digitados[id] ?? item.amount}
            className="rounded-xl h-9 text-sm"
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
        )}
      </li>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px] bg-background">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[20px] flex items-center justify-center bg-primary text-primary-foreground shadow-xl shadow-primary/20 shrink-0">
                  {resultado ? <CheckCircle2 className="h-7 w-7" /> : <Scissors className="h-7 w-7" />}
                </div>
                <div className="space-y-0.5 text-left">
                  <DialogTitle className="text-2xl font-black tracking-tight">
                    {resultado ? "Divisão gerada" : "Revisar a divisão"}
                  </DialogTitle>
                  <DialogDescription className="font-medium">
                    {resultado
                      ? `${resultado.receipt.description ?? "Salário"} de ${formatarMoeda(resultado.receipt.amount)}`
                      : revisao
                        ? `${revisao.receipt.description} de ${formatarMoeda(revisao.receipt.amount)}, recebido em ${dataCurta(revisao.receipt.date)}`
                        : "Calculando pelo seu plano..."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {resultado ? (
              <ResultadoDaDivisao divisao={resultado} onDesfazer={() => onDesfazer(resultado)} onFechar={() => onOpenChange(false)} />
            ) : !revisao ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Transações que serão criadas
                  </h3>
                  {transacoes.length ? (
                    <ul className="space-y-2" aria-label="Transações que serão criadas">
                      {transacoes.map((item) => linhaDoItem(item, true))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma parte do plano gera transação.</p>
                  )}
                </div>

                {ficam.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ficam na conta do salário</h3>
                    <ul className="space-y-2" aria-label="Partes que ficam na conta do salário">
                      {ficam.map((item) => linhaDoItem(item, false))}
                    </ul>
                  </div>
                )}

                <div className="rounded-2xl bg-muted/30 p-4 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-muted-foreground">Total das transações</span>
                    <span className="font-black" data-testid="total-da-divisao">{formatarMoeda(revisao.total)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-muted-foreground">Fica livre na conta do salário</span>
                    <span className="font-black" data-testid="livre-da-divisao">{formatarMoeda(revisao.free)}</span>
                  </div>
                </div>

                {semDestino && (
                  <p className="text-xs font-bold text-destructive">
                    Escolha o destino de todas as partes no plano antes de gerar.
                  </p>
                )}

                <label className="flex items-start gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/5 cursor-pointer">
                  <Checkbox
                    checked={confirmado}
                    onCheckedChange={(marcado) => setConfirmado(marcado === true)}
                    aria-label="Confirmo que fiz essas transferências no banco"
                    className="mt-0.5"
                  />
                  <span className="text-sm font-bold">Confirmo que fiz essas transferências no banco</span>
                </label>

                <Button
                  className="w-full rounded-2xl font-black text-sm h-12 shadow-lg shadow-primary/20"
                  disabled={!confirmado || transacoes.length === 0 || gerando || recalculando}
                  onClick={gerar}
                >
                  {gerando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {`Gerar ${quantidadeDeTransacoes(transacoes.length)} de ${formatarMoeda(revisao.total)}`}
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
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
  return (
    <div className="space-y-4">
      <ul className="space-y-2" aria-label="Transações criadas">
        {divisao.transactions.map((transacao) => (
          <li
            key={transacao.transfer_id ?? transacao.part_name}
            className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-border/40 bg-background/60"
          >
            <div className="min-w-0">
              <p className="font-bold text-sm">
                {transacao.kind === "GOAL_DEPOSIT" ? "Aporte" : "Transferência"}: {transacao.part_name}
              </p>
              <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-1">
                <span>{transacao.origin_account.name}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{transacao.destination_name}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1" />
                <span>{dataCurta(transacao.date)}</span>
              </p>
            </div>
            <p className="font-black text-sm whitespace-nowrap">{formatarMoeda(transacao.amount)}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm font-medium text-muted-foreground">
        Ficou livre na conta do salário: <span className="font-black text-foreground">{formatarMoeda(divisao.free)}</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        {!divisao.undone_at && (
          <Button variant="outline" className="rounded-2xl font-bold text-xs h-11 flex-1" onClick={onDesfazer}>
            <Undo2 className="mr-2 h-4 w-4" /> Desfazer divisão
          </Button>
        )}
        <Button className="rounded-2xl font-bold text-xs h-11 flex-1" onClick={onFechar}>
          Concluir
        </Button>
      </div>
      {!divisao.undone_at && (
        <p className="text-[11px] text-muted-foreground font-medium">
          Você pode desfazer até {dataCurta(divisao.can_undo_until)}.
        </p>
      )}
    </div>
  )
}
