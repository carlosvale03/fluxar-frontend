"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, Receipt, AlertCircle, ArrowRight, Wallet, CheckCircle2, PlusCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MoneyInput } from "@/components/ui/money-input"
import { formatarMoeda, maiorQueZero, paraCentavos } from "@/lib/dinheiro"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { lerData } from "@/lib/datas"

import { api, mensagemDeErro } from "@/services/apiClient"
import { Account, AccountTypeLabels } from "@/types/accounts"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { CreditCard, Invoice } from "@/types/cards"
import { tratarErro } from "@/lib/erros"

const formSchema = z.object({
  // CONTRATO-17: o valor vai à API como texto decimal ("1234.56")
  amount: z.string().refine(maiorQueZero, "O valor deve ser maior que 0."),
  date: z.date(),
  account_id: z.string().min(1, "Selecione a conta de pagamento."),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface InvoicePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  // New props for handling specific invoice payment
  invoiceId?: string
  initialAmount?: string
}

export function InvoicePaymentDialog({ open, onOpenChange, onSuccess, invoiceId: propInvoiceId, initialAmount }: InvoicePaymentDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
  const [selectedCardObject, setSelectedCardObject] = useState<CreditCard | null>(null)
  const [selectedInvoiceObject, setSelectedInvoiceObject] = useState<Invoice | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)

  // FATURA-29: um identificador por abertura do diálogo, reenviado em toda
  // nova tentativa até o sucesso; fechar e abrir de novo gera outro
  const chaveDaTentativa = useRef("")
  useEffect(() => {
    if (open) chaveDaTentativa.current = crypto.randomUUID()
  }, [open])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      amount: "",
      date: new Date(),
      account_id: "",
      description: "Pagamento de Fatura",
    },
  })
  
  const fetchAccounts = async () => {
    try {
        const response = await api.get("/accounts/")
        const data = response.data
        setAccounts(data)
    } catch (err) {
        // CONTRATO-33: nenhuma falha silenciosa
        tratarErro(err, { mensagemPadrao: "Erro ao carregar contas.", tentarDeNovo: fetchAccounts })
    }
  }

  // Refactored initialization to avoid race conditions
  useEffect(() => {
    if (open) {
        const initialize = async () => {
            setIsLoading(true)
            try {
                // 1. Fetch accounts first
                await fetchAccounts()
                
                // 2. Reset form to defaults
                form.reset({
                    amount: initialAmount || "",
                    date: new Date(),
                    account_id: "",
                    description: "Pagamento de Fatura",
                })
                setSelectedCardId("")
                setSelectedInvoiceId("")
                setSelectedInvoiceObject(null)
                setInvoices([])

                // 3. Handle specific invoice or general cards
                if (propInvoiceId) {
                    const invoiceRes = await api.get(`/invoices/${propInvoiceId}/`)
                    const invoice = invoiceRes.data
                    setSelectedInvoiceObject(invoice)
                    
                    if (invoice.credit_card_id) {
                        const cardRes = await api.get(`/credit-cards/${invoice.credit_card_id}/`)
                        const cardData = cardRes.data
                        if (cardData.account_id) {
                            form.setValue('account_id', cardData.account_id)
                        }
                    }
                } else {
                    const cardsResponse = await api.get("/credit-cards/")
                    setCards(cardsResponse.data)
                }
            } catch (error) {
                console.error("Initialization failed", error)
                toast.error("Erro ao carregar dados do pagamento.")
            } finally {
                setIsLoading(false)
            }
        }
        
        initialize()
    }
  }, [open, propInvoiceId, initialAmount, form])

  // Keeps account synced when manually choosing a card
  useEffect(() => {
      if (selectedCardId && cards.length > 0) {
          const card = cards.find(c => c.id === selectedCardId)
          if (card) {
              setSelectedCardObject(card)
              if (card.account_id) {
                  form.setValue('account_id', card.account_id)
              }
              fetchInvoices(card.id)
          }
      }
  }, [selectedCardId, cards, form])

  const fetchInvoices = async (cardId: string) => {
      try {
          // Fetch invoices for the specific card
          const response = await api.get(`/credit-cards/${cardId}/invoices/`)
          const allInvoices = response.data
          
          // Client-side filtering to ensure PAID invoices are excluded
          // We only want OPEN, OVERDUE, or CLOSED (if not fully paid)
          const payableInvoices = allInvoices.filter((inv: any) => inv.status !== 'PAID')
          
          setInvoices(payableInvoices)
      } catch (error) {
          // CONTRATO-33: nenhuma falha silenciosa
          tratarErro(error, { mensagemPadrao: "Erro ao carregar as faturas.", tentarDeNovo: () => fetchInvoices(cardId) })
      }
  }

  // SALDO-18: o pagamento só existe com uma fatura; o endpoint genérico
  // recusa INVOICE_PAYMENT
  const targetInvoiceId = propInvoiceId || selectedInvoiceId

  const onSubmit = async (data: FormValues) => {
    if (!targetInvoiceId) return

    setIsLoading(true)
    try {
      const payload = {
          amount: data.amount,
          account_id: data.account_id,
          date: format(data.date, "yyyy-MM-dd"),
          idempotency_key: chaveDaTentativa.current,
      }

      await api.post(`/invoices/${targetInvoiceId}/pay/`, payload)

      toast.success("Pagamento registrado.")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(mensagemDeErro(error, "Erro ao registrar pagamento."))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
        <ScrollArea className="max-h-[95vh]">
            <div className="p-6">
                <DialogHeader className="mb-6">
                    <div className="flex items-center gap-3">
                        <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-fg-secondary">
                            <Receipt className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <DialogTitle>
                                Liquidar Fatura
                            </DialogTitle>
                            <DialogDescription>
                                Baixa financeira de cartão de crédito
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                
                <Form {...form}>
                    <form 
                        onSubmit={form.handleSubmit(onSubmit, (err) => console.error("Invoice Payment Validation Errors:", err))} 
                        className="space-y-6"
                    >
                        {/* Seção 1: Origem e Valor */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="label text-muted-foreground">Fluxo de Saída</h3>
                                <Badge variant="secondary">Pagamento Direto</Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4">
                                <FormField
                                    control={form.control}
                                    name="account_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel>Pagar com a Conta</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione a conta..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="max-h-[450px] p-2">
                                                    <div className="flex flex-col">
                                                        <AccountFormDialog 
                                                            onSuccess={() => fetchAccounts()}
                                                            trigger={
                                                                <Button 
                                                                    type="button"
                                                                    variant="ghost" 
                                                                    className="mb-1 w-full justify-start gap-2"
                                                                >
                                                                    <PlusCircle aria-hidden="true" />
                                                                    Nova Conta
                                                                </Button>
                                                            }
                                                        />

                                                        <div className="px-2 mb-2">
                                                            <Separator />
                                                        </div>

                                                        {["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].map((type, typeIndex) => {
                                                            const groupAccounts = accounts.filter(acc => acc.is_active && acc.type === type);
                                                            if (groupAccounts.length === 0) return null;

                                                            return (
                                                                <div key={type}>
                                                                    {typeIndex > 0 && accounts.some(acc => acc.is_active && ["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].slice(0, typeIndex).includes(acc.type)) && (
                                                                        <div className="px-2 my-2">
                                                                            <Separator />
                                                                        </div>
                                                                    )}
                                                                    <div className="px-3 py-1 mb-1">
                                                                        <span className="label text-muted-foreground">
                                                                            {AccountTypeLabels[type as keyof typeof AccountTypeLabels]}
                                                                        </span>
                                                                    </div>
                                                                    {groupAccounts.map((acc) => (
                                                                        <SelectItem 
                                                                            key={acc.id} 
                                                                            value={acc.id} 
                                                                            className="group py-2"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div 
                                                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                                                                    style={{ 
                                                                                        backgroundColor: `${acc.color}15`, 
                                                                                        color: acc.color 
                                                                                    }}
                                                                                >
                                                                                    <Wallet className="h-4 w-4" />
                                                                                </div>

                                                                                <div className="flex flex-col text-left">
                                                                                    <span className="text-sm font-medium">
                                                                                        {acc.name}
                                                                                    </span>
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {AccountTypeLabels[acc.type] || "Conta"}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>Valor do Pagamento</FormLabel>
                                                <FormControl>
                                                    <MoneyInput
                                                        value={field.value ?? ""}
                                                        onValueChange={(valor) => field.onChange(valor ?? "")}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>Data Efetivada</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "w-full justify-start font-mono font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar..."}
                                                                <CalendarIcon className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                            locale={ptBR}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção 2: Detalhes da Fatura */}
                        <div className="space-y-3">
                            <h3 className="label text-muted-foreground">Destino do Pagamento</h3>

                            {selectedInvoiceObject && propInvoiceId ? (
                                <div className="space-y-4 rounded-lg border border-border p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <div>
                                                    <p className="label text-muted-foreground">Fatura de Referência</p>
                                                    <p className="text-sm font-medium">
                                                        {format(lerData(selectedInvoiceObject.due_date), "MMMM 'de' yyyy", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {selectedInvoiceObject.status === 'OVERDUE' ? (
                                                <Badge variant="destructive">Vencida</Badge>
                                            ) : selectedInvoiceObject.status === 'CLOSED' ? (
                                                <Badge variant="warning">Fechada</Badge>
                                            ) : (
                                                <Badge variant="info">Aberta</Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                                        <div>
                                            <p className="label text-muted-foreground">Vencimento</p>
                                            <p className="font-mono text-sm">{format(lerData(selectedInvoiceObject.due_date), "dd/MM/yyyy")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="label text-muted-foreground">Total Previsto</p>
                                            <p className="value-m">
                                                {formatarMoeda(selectedInvoiceObject.total_amount)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : propInvoiceId ? (
                                <div className="flex h-24 w-full items-center justify-center rounded-lg border border-border">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Carregando a fatura" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <FormLabel>Cartão de Origem</FormLabel>
                                                <Select onValueChange={setSelectedCardId} value={selectedCardId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Escolher cartão..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {cards.map((card) => (
                                                            <SelectItem key={card.id} value={card.id}>
                                                                <div className="flex items-center gap-2">
                                                                    {/* Cor do cartão: dado do usuário */}
                                                                    <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", !card.color && "bg-muted-foreground")} style={card.color ? { backgroundColor: card.color } : undefined} />
                                                                    {card.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {selectedCardId && (
                                                <div className="space-y-2">
                                                    <FormLabel>Fatura de Referência</FormLabel>
                                                    <Select onValueChange={(val) => {
                                                        setSelectedInvoiceId(val)
                                                        const inv = invoices.find(i => i.id === val)
                                                        if (inv) {
                                                            setSelectedInvoiceObject(inv)
                                                            form.setValue('amount', inv.total_amount)
                                                            const monthName = format(lerData(inv.due_date), "MMMM", { locale: ptBR })
                                                            const formattedDate = monthName.charAt(0).toUpperCase() + monthName.slice(1) + format(lerData(inv.due_date), "/yyyy")
                                                            form.setValue('description', `Fatura ${formattedDate}`)
                                                        }
                                                    }} value={selectedInvoiceId}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecionar mês..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[250px]">
                                                            {invoices.length === 0 ? (
                                                                <SelectItem value="none" disabled>Nenhuma fatura disponível</SelectItem>
                                                            ) : (
                                                                invoices.map((inv) => {
                                                                    const date = lerData(inv.due_date)
                                                                    const month = format(date, "MMMM", { locale: ptBR })
                                                                    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
                                                                    const year = format(date, "yyyy")
                                                                    
                                                                    return (
                                                                        <SelectItem key={inv.id} value={inv.id}>
                                                                            <div className="flex w-full min-w-[200px] items-center justify-between">
                                                                                <span>{capitalizedMonth} {year}</span>
                                                                                <span className="ml-4 font-mono text-xs text-muted-foreground">
                                                                                    {formatarMoeda(inv.total_amount)}
                                                                                </span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    )
                                                                })
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {!targetInvoiceId && (
                                                <p role="alert" className="text-sm text-outflow">
                                                    Escolha a fatura a pagar.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {selectedInvoiceObject && (
                                        <div className="space-y-4 rounded-lg border border-border p-4">
                                            <div className="flex items-center justify-between border-b border-border pb-3">
                                                <div className="space-y-1">
                                                    <p className="label text-muted-foreground">Fatura de Referência</p>
                                                    <div className="flex items-center gap-2">
                                                        <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                        <p className="text-sm font-medium">
                                                            {format(lerData(selectedInvoiceObject.due_date), "MMMM 'de' yyyy", { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-1">
                                                    <p className="label text-muted-foreground">Situação</p>
                                                    {selectedInvoiceObject.status === 'OVERDUE' ? (
                                                        <Badge variant="destructive">Vencida</Badge>
                                                    ) : selectedInvoiceObject.status === 'CLOSED' ? (
                                                        <Badge variant="warning">Fechada</Badge>
                                                    ) : (
                                                        <Badge variant="info">Aberta</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <p className="label text-muted-foreground">Vencimento</p>
                                                    <span className="font-mono text-sm">{format(lerData(selectedInvoiceObject.due_date), "dd/MM/yyyy")}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="label text-muted-foreground">Total Devido</p>
                                                    <p className="value-l">
                                                        {formatarMoeda(selectedInvoiceObject.total_amount)}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="pt-2">
                                                <div className="label mb-1.5 flex items-center justify-between text-muted-foreground">
                                                    <span>Progresso de Quitação</span>
                                                    <span>{Math.round((paraCentavos(form.watch('amount')) / paraCentavos(selectedInvoiceObject.total_amount)) * 100)}%</span>
                                                </div>
                                                <Progress value={(paraCentavos(form.watch('amount')) / paraCentavos(selectedInvoiceObject.total_amount)) * 100} className="h-1.5" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel>Memo / Descrição Opcional</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Ex: Quitação parcial da fatura..." 
                                            {...field} 

                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="border-t border-border pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                loading={isLoading}
                                disabled={!targetInvoiceId}
                            >
                                Confirmar Baixa
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
