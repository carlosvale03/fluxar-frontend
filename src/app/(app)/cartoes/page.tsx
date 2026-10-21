"use client"

import { useEffect, useState } from "react"
import { Plus, Filter, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmacaoDestrutiva } from "@/components/ui/confirmacao-destrutiva"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { CreditCardItem } from "@/components/cards/credit-card-item"
import { CreditCardFormDialog } from "@/components/cards/credit-card-form-dialog"
import { api } from "@/services/apiClient"
import { CreditCard as ICreditCard } from "@/types/cards"
import { usePlan } from "@/hooks/use-plan"
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
import { cn } from "@/lib/utils"
import { tratarErro } from "@/lib/erros"
import { AvisoDoPlano } from "@/components/planos/recurso-bloqueado"
import { InvoiceList } from "@/components/cards/invoice-list"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { Invoice } from "@/types/cards"

const TITULO = "Cartões"
const APOIO = "Cartões e faturas"

// PERM-19 e PERM-22: com `cartoes` fechado, a tela mostra o aviso do plano no
// lugar dos cartões (sem "Novo cartão") e, abaixo, as faturas dos cartões que
// já existem, que continuam podendo ser pagas e estornadas
export default function CardsPage() {
  const { podeUsar } = usePlan()
  const cartoes = podeUsar("cartoes")
  if (cartoes === null) return null
  return cartoes ? <TelaDeCartoes /> : <FaturasComCartoesTravados />
}

// SPEC_DEVIATION: a spec lista /credit-cards/ entre as rotas da trava `cartoes`.
// Reason: PERM-22 exige pagar e estornar as faturas existentes; por isso a
// leitura dos cartões e das faturas segue liberada (decisão do design.md).
function FaturasComCartoesTravados() {
  const [cards, setCards] = useState<ICreditCard[]>([])
  const [faturaParaPagar, setFaturaParaPagar] = useState<Invoice | null>(null)
  // Recria as listas de faturas depois de pagar ou estornar
  const [versao, setVersao] = useState(0)

  const carregarCartoes = async () => {
    try {
      const response = await api.get("/credit-cards/")
      setCards(response.data || [])
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao carregar cartões.", tentarDeNovo: carregarCartoes })
    }
  }

  useEffect(() => {
    carregarCartoes()
  }, [])

  const estornar = async (invoice: Invoice) => {
    try {
      await api.post(`/invoices/${invoice.id}/unpay/`)
      toast.success("Pagamento desfeito.")
      setVersao((v) => v + 1)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao desfazer pagamento." })
    }
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6">
      <CabecalhoDePagina titulo={TITULO} apoio={APOIO} className="pb-0" />

      <AvisoDoPlano />

      {cards.length > 0 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="display-m">Faturas dos seus cartões</h2>
            <p className="text-sm text-muted-foreground">
              Você continua podendo pagar e estornar as faturas dos cartões que já tem.
            </p>
          </div>
          {cards.map((card) => (
            <section key={`${card.id}-${versao}`} aria-label={`Faturas do ${card.name}`} className="space-y-3">
              <h3 className="display-s">{card.name}</h3>
              <InvoiceList cardId={card.id} onPayInvoice={setFaturaParaPagar} onUnpayInvoice={estornar} />
            </section>
          ))}
        </div>
      )}

      <InvoicePaymentDialog
        open={!!faturaParaPagar}
        onOpenChange={(aberto) => {
          if (!aberto) setFaturaParaPagar(null)
        }}
        invoiceId={faturaParaPagar?.id}
        initialAmount={faturaParaPagar?.total_amount}
        onSuccess={() => {
          setFaturaParaPagar(null)
          setVersao((v) => v + 1)
        }}
      />
    </div>
  )
}

function TelaDeCartoes() {
  const [cards, setCards] = useState<ICreditCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<ICreditCard | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<ICreditCard | null>(null)

  // Filter States
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([])

  const { limiteAtingido, atualizarUso } = usePlan()

  // Extract unique institutions from registered cards
  const availableInstitutions = Array.from(new Set(cards.map(c => c.institution).filter(Boolean))) as string[]

  // PERM-18 e PERM-20: o limite e o uso vêm do acesso do /auth/me
  const hasReachedLimit = limiteAtingido("limite_cartoes")

  const filteredCards = cards.filter(card => {
      const matchesInstitution = selectedInstitutions.length === 0 || (card.institution && selectedInstitutions.includes(card.institution))
      return matchesInstitution
  })

  const resetFilters = () => {
      setSelectedInstitutions([])
  }

  const fetchCards = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/credit-cards/")
      const data = response.data
      setCards(data || [])
    } catch {
      toast.error("Erro ao carregar cartões.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [])

  const handleEdit = (card: ICreditCard) => {
    setSelectedCard(card)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (card: ICreditCard) => {
    setCardToDelete(card)
  }

  const confirmDelete = async () => {
    if (!cardToDelete) return
    try {
      await api.delete(`/credit-cards/${cardToDelete.id}/`)
    } catch (error) {
      // A confirmação continua aberta
      toast.error("Erro ao excluir cartão.")
      throw error
    }
    toast.success("Cartão excluído.")
    // PERM-20: o item excluído sai do uso dos limites do /auth/me
    void atualizarUso()
    fetchCards()
  }

  const handleFormSuccess = () => {
    fetchCards()
    setIsFormOpen(false)
    setSelectedCard(undefined)
  }

  const handleCreateClick = () => {
      setSelectedCard(undefined)
      setIsFormOpen(true)
  }

  const toggleInstitution = (inst: string) => {
      setSelectedInstitutions(prev =>
          prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst]
      )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
      <CabecalhoDePagina
        titulo={TITULO}
        apoio={APOIO}
        acoes={
          <>
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(selectedInstitutions.length > 0 && "border-gold-line")}
                    >
                        <Filter aria-hidden="true" />
                        Filtros
                        {selectedInstitutions.length > 0 && (
                            <Badge className="ml-1">{selectedInstitutions.length}</Badge>
                        )}
                    </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col overflow-hidden p-0 sm:max-w-md">
                    <div className="flex-1 overflow-y-auto p-6">
                        <SheetHeader className="mb-6">
                            <SheetTitle>Filtros</SheetTitle>
                            <SheetDescription>
                                Mostre só os cartões das instituições escolhidas.
                            </SheetDescription>
                        </SheetHeader>

                        <fieldset className="space-y-3">
                            <div className="flex items-center justify-between">
                                <legend className="label text-muted-foreground">Instituições</legend>
                                {selectedInstitutions.length > 0 && (
                                    <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setSelectedInstitutions([])}>
                                        Limpar
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableInstitutions.length > 0 ? availableInstitutions.map((inst) => {
                                    const marcada = selectedInstitutions.includes(inst)
                                    return (
                                        <div
                                            key={inst}
                                            className={cn(
                                                "flex items-center gap-3 rounded-md border p-3 transition-colors duration-fast",
                                                marcada ? "border-gold-line bg-elevated" : "border-border hover:bg-elevated"
                                            )}
                                        >
                                            <Checkbox
                                                id={`inst-${inst}`}
                                                checked={marcada}
                                                onCheckedChange={() => toggleInstitution(inst)}
                                            />
                                            <Label
                                                htmlFor={`inst-${inst}`}
                                                className="flex-1 cursor-pointer text-sm capitalize"
                                            >
                                                {inst}
                                            </Label>
                                        </div>
                                    )
                                }) : (
                                    <p className="p-2 text-sm text-muted-foreground">Nenhuma instituição encontrada.</p>
                                )}
                            </div>
                        </fieldset>
                    </div>

                    <SheetFooter className="border-t border-border p-6">
                        <div className="flex w-full gap-2">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={resetFilters}
                            >
                                <RotateCcw aria-hidden="true" /> Limpar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => setIsFilterSheetOpen(false)}
                            >
                                Ver Resultados
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <Button
                onClick={handleCreateClick}
                disabled={isLoading || hasReachedLimit}
            >
                <Plus aria-hidden="true" /> Novo Cartão
            </Button>
          </>
        }
      />

      {/* PERM-20: uso e limite de cartões do plano */}
      <div className="mb-6">
        <AvisoDeLimite chave="limite_cartoes" rotulo="cartões" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 w-full rounded-lg" />
            ))}
        </div>
      ) : filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
              <Filter className="mb-4 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="display-s">Nenhum cartão para estes filtros</h2>
              <p className="mx-auto mb-6 mt-2 max-w-md text-sm text-muted-foreground">
                  Nenhum cartão corresponde aos filtros escolhidos. Limpe os filtros para ver todos os cartões.
              </p>
              <Button onClick={resetFilters} variant="outline">
                Limpar Filtros
              </Button>
          </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => (
                <CreditCardItem
                    key={card.id}
                    card={card}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                />
            ))}
        </div>
      )}

      {/* Card Form Dialog */}
      <CreditCardFormDialog
        open={isFormOpen}
        onOpenChange={(val) => {
            setIsFormOpen(val)
            if (!val) setSelectedCard(undefined)
        }}
        card={selectedCard}
        onSuccess={handleFormSuccess}
      />

      {/* AZ-25: confirmação destrutiva com o impacto da exclusão */}
      <ConfirmacaoDestrutiva
        aberta={!!cardToDelete}
        onAbertaChange={(aberta) => !aberta && setCardToDelete(null)}
        titulo={`Excluir o cartão ${cardToDelete?.name ?? ""}?`}
        descricao="O histórico de faturas deste cartão pode ser perdido e as transações ligadas a ele ficarão sem cartão. Isso não pode ser desfeito."
        rotuloConfirmar="Excluir cartão"
        onConfirmar={confirmDelete}
      />
    </div>
  )
}
