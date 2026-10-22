"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Edit, Info } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { lerData } from "@/lib/datas"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Valor } from "@/components/ui/valor"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"

import { api } from "@/services/apiClient"
import { CreditCard } from "@/types/cards"
import { Account } from "@/types/accounts"
import { InvoiceList } from "@/components/cards/invoice-list"
import { BarraDoLimite } from "@/components/cards/credit-card-item"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { Invoice } from "@/types/cards"
import { CreditCardFormDialog } from "@/components/cards/credit-card-form-dialog"
import { paraCentavos } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { usePlan } from "@/hooks/use-plan"
import { AvisoDoPlano } from "@/components/planos/recurso-bloqueado"

export default function CardDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  // PERM-19 e PERM-22: com `cartoes` fechado, o detalhe mostra o aviso do
  // plano e some com o que cria ou edita (editar o cartão); ver o cartão e
  // as faturas, pagar e estornar continuam liberados.
  // SPEC_DEVIATION: a spec lista /credit-cards/ entre as rotas da trava.
  // Reason: PERM-22 exige pagar e estornar as faturas existentes; por isso a
  // leitura do cartão e das faturas segue liberada (decisão do design.md).
  const { podeUsar } = usePlan()
  const cartoesLiberados = podeUsar("cartoes") === true
  const cartoesTravados = podeUsar("cartoes") === false

  const [card, setCard] = useState<CreditCard | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Payment Dialog State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined)

  const fetchCard = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/credit-cards/${id}/`)
      const cardData = response.data
      setCard(cardData)

      if (cardData.account_id) {
          try {
              const accResponse = await api.get(`/accounts/${cardData.account_id}/`)
              setAccount(accResponse.data)
          } catch (err) {
              // CONTRATO-33: nenhuma falha silenciosa
              tratarErro(err, { mensagemPadrao: "Não foi possível carregar a conta do cartão.", tentarDeNovo: fetchCard })
          }
      }
    } catch {
      toast.error("Não foi possível abrir o cartão. Escolha-o de novo na lista.")
      router.push("/cartoes")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchCard()
  }, [id, router])

  const handlePayInvoice = (invoice: Invoice) => {
      setSelectedInvoice(invoice)
      setIsPaymentOpen(true)
  }

  const handleUnpayInvoice = async (invoice: Invoice) => {
      try {
          await api.post(`/invoices/${invoice.id}/unpay/`)
          toast.success("Pagamento desfeito.")
          // Reload to refresh logic
           // Ideally update local state, but invoice logic affects many transactions.
          window.location.reload()
      } catch (error) {
          console.error("Failed to unpay invoice", error)
          toast.error("Não foi possível desfazer o pagamento. Tente de novo.")
      }
  }
  if (isLoading) {
    return (
        <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6" aria-busy="true" aria-label="Carregando o cartão">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-56 rounded-lg" />
                <Skeleton className="h-56 rounded-lg md:col-span-2" />
            </div>

            <Skeleton className="h-80 w-full rounded-lg" />
        </div>
    )
  }

  if (!card) return null

  // CONTRATO-16: os valores chegam como texto; a conta é feita em centavos
  const limit = paraCentavos(card.limit) || 0
  // FATURA-42: o limite disponível vem só do backend
  const available = card.available_limit
  const usedAmount = limit - paraCentavos(available)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href="/cartoes">
              <ArrowLeft aria-hidden="true" /> Cartões
          </Link>
      </Button>

      <CabecalhoDePagina
        titulo={card.name}
        apoio={account ? `Cartão de crédito vinculado a ${account.name}` : "Cartão de crédito"}
        acoes={
          cartoesLiberados && (
              <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                  <Edit aria-hidden="true" /> Editar cartão
              </Button>
          )
        }
      />

      {cartoesTravados && (
        <AvisoDoPlano
          titulo="Cartões"
          className="mb-6"
        />
      )}

      {/* Ciclo do cartão: alerta informativo com a listra lateral (DESIGN.md §5, Alertas) */}
      <div className="mb-6 flex items-start gap-3 rounded-r-lg border border-border border-l-[3px] border-l-info bg-card p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Ciclo da fatura</h2>
            <p className="max-w-2xl text-sm text-fg-secondary">
              Este cartão fecha no dia <strong className="font-semibold text-foreground">{card.closing_day}</strong> e vence no dia <strong className="font-semibold text-foreground">{card.due_day}</strong>.
              Gastos feitos depois do fechamento entram na fatura do mês seguinte.
            </p>
          </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
          {/* Main Info Card */}
          <Card className="relative overflow-hidden">
              {card.color && (
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: card.color }} />
              )}
              <CardHeader className="p-5 pb-2">
                  <CardTitle>Visão geral</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-5 pt-3">
                  <div>
                      <p className="label mb-1 text-muted-foreground">Limite total</p>
                      <Valor valor={card.limit} direcao="neutro" tamanho="l" />
                  </div>

                  <dl className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-border p-3">
                          <dt className="label mb-1 text-muted-foreground">Fechamento</dt>
                          <dd className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> Dia {card.closing_day}
                          </dd>
                      </div>
                      <div className="rounded-md border border-border p-3">
                          <dt className="label mb-1 text-muted-foreground">Vencimento</dt>
                          <dd className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> Dia {card.due_day}
                          </dd>
                      </div>
                  </dl>
              </CardContent>
          </Card>

          {/* Current Invoice Info */}
          <Card className="md:col-span-2">
              <CardHeader className="p-5 pb-2">
                  <div className="flex items-center justify-between">
                        <CardTitle>Fatura atual</CardTitle>
                        <Badge variant="warning">Aberta</Badge>
                  </div>
              </CardHeader>
              <CardContent className="p-5 pt-3">
                  <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                      <div className="space-y-1">
                          <p className="label mb-1 text-muted-foreground">Valor parcial</p>
                          <Valor valor={card.current_invoice_total} direcao="neutro" tamanho="l" />
                          {/* FATURA-06: o próximo vencimento calculado pelo backend */}
                          {card.next_due_date && (
                              <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Vence em {format(lerData(card.next_due_date), "dd/MM")}
                              </p>
                          )}
                      </div>

                      <div className="w-full max-w-md flex-1 space-y-2">
                          <div className="flex items-end justify-between">
                              <span className="label text-muted-foreground">Limite disponível</span>
                              <Valor valor={available} direcao="neutro" />
                          </div>
                          <BarraDoLimite utilizado={usedAmount} limite={limit} />
                          <p className="text-xs text-muted-foreground">Percentual do limite já utilizado</p>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* Invoices List Section */}
      <section className="space-y-4" aria-labelledby="historico-de-faturas">
          <h2 id="historico-de-faturas" className="display-m">Histórico de faturas</h2>
          <InvoiceList cardId={id} onPayInvoice={handlePayInvoice} onUnpayInvoice={handleUnpayInvoice} />
      </section>

      {cartoesLiberados && (
        <CreditCardFormDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          card={card}
          onSuccess={fetchCard}
        />
      )}

      <InvoicePaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        invoiceId={selectedInvoice?.id}
        initialAmount={selectedInvoice?.total_amount}
        onSuccess={() => {
            fetchCard()
            window.location.reload()
        }}
      />
    </div>
  )
}
