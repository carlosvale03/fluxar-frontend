"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, Receipt, AlertCircle } from "lucide-react"
import { toast } from "sonner"

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

import { api } from "@/services/apiClient"
import { Account } from "@/types/accounts"

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
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
  initialAmount?: number
}

export function InvoicePaymentDialog({ open, onOpenChange, onSuccess, invoiceId: propInvoiceId, initialAmount }: InvoicePaymentDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<any[]>([]) // TODO: Type for CreditCard
  const [invoices, setInvoices] = useState<any[]>([]) // TODO: Type for Invoice
  
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
  
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      amount: 0,
      date: new Date(),
      account_id: "",
      description: "Pagamento de Fatura",
    },
  })
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
        form.reset({
            amount: initialAmount || 0,
            date: new Date(),
            account_id: "",
            description: "Pagamento de Fatura",
        })
        setSelectedCardId("")
        setSelectedInvoiceId("")
        setInvoices([])
        
        fetchAccounts()
        if (!propInvoiceId) {
            fetchCards()
        }
    }
  }, [open, form, initialAmount, propInvoiceId])

  useEffect(() => {
      if (selectedCardId) {
          fetchInvoices(selectedCardId)
      } else {
          setInvoices([])
      }
  }, [selectedCardId])

  const fetchAccounts = async () => {
      try {
          const response = await api.get("/accounts/")
          setAccounts(response.data.results || response.data || [])
      } catch (error) {
          console.error("Failed to fetch accounts", error)
          toast.error("Erro ao carregar contas.")
      }
  }

  const fetchCards = async () => {
      try {
          const response = await api.get("/credit-cards/")
          setCards(response.data.results || response.data || [])
      } catch (error) {
          console.error("Failed to fetch cards", error)
      }
  }

  const fetchInvoices = async (cardId: string) => {
      try {
          // Fetch invoices for the specific card
          const response = await api.get(`/credit-cards/${cardId}/invoices/`)
          const allInvoices = response.data.results || response.data || []
          
          // Client-side filtering to ensure PAID invoices are excluded
          // We only want OPEN, OVERDUE, or CLOSED (if not fully paid)
          const payableInvoices = allInvoices.filter((inv: any) => inv.status !== 'PAID')
          
          setInvoices(payableInvoices)
      } catch (error) {
          console.error("Failed to fetch invoices", error)
      }
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      const payload = {
          amount: data.amount,
          account_id: data.account_id,
          date: format(data.date, "yyyy-MM-dd"),
      }
      
      const targetInvoiceId = propInvoiceId || selectedInvoiceId
      
      let response
      if (targetInvoiceId) {
          response = await api.post(`/invoices/${targetInvoiceId}/pay/`, payload)
      } else {
           // Fallback generic payment
           response = await api.post("/transactions/", {
              ...payload, 
              description: data.description,
              type: "INVOICE_PAYMENT"
           })
      }

      toast.success("Pagamento registrado!")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error submitting invoice payment:", error)
      toast.error("Erro ao registrar pagamento.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-500" />
            Pagamento de Fatura
          </DialogTitle>
          <DialogDescription>
            Registre o pagamento da fatura.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 gap-4">
                 <FormField
                    control={form.control}
                    name="account_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Conta de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Valor Pago (R$)</FormLabel>
                        <FormControl>
                            <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0,00" 
                                {...field} 
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
                    <FormItem className="flex flex-col mt-2.5">
                    <FormLabel>Data do Pagamento</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                            ) : (
                                <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date > new Date("2100-01-01") ||
                            date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

             {propInvoiceId ? (
                 <div className="p-3 mb-4 bg-muted/40 rounded-lg border text-sm">
                     <p className="text-muted-foreground">
                         Pagamento da fatura <strong>#{propInvoiceId.slice(0, 8)}...</strong>
                     </p>
                     {initialAmount && (
                         <p className="font-medium mt-1">
                             Valor sugerido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialAmount)}
                         </p>
                     )}
                 </div>
             ) : (
                 <div className="space-y-4 mb-4 p-4 border rounded-lg bg-muted/20">
                     <h4 className="text-sm font-medium">Selecionar Fatura</h4>
                     
                     <div className="grid grid-cols-1 gap-2">
                         <FormLabel className="text-xs">Cartão</FormLabel>
                         <Select onValueChange={setSelectedCardId} value={selectedCardId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o cartão..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cards.map((card) => (
                                    <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                     </div>

                     {selectedCardId && (
                         <div className="grid grid-cols-1 gap-2">
                             <FormLabel className="text-xs">Fatura</FormLabel>
                             <Select onValueChange={(val) => {
                                 setSelectedInvoiceId(val)
                                 const inv = invoices.find(i => i.id === val)
                                 if (inv) {
                                     // Fix: Use total_amount instead of amount
                                     form.setValue('amount', Number(inv.total_amount))
                                     // Fix: Add locale and capitalizing
                                     const monthName = format(new Date(inv.due_date), "MMMM", { locale: ptBR })
                                     const formattedDate = monthName.charAt(0).toUpperCase() + monthName.slice(1) + format(new Date(inv.due_date), "/yyyy")
                                     form.setValue('description', `Fatura ${formattedDate}`)
                                 }
                             }} value={selectedInvoiceId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a fatura..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {invoices.length === 0 ? (
                                        <SelectItem value="none" disabled>Nenhuma fatura aberta</SelectItem>
                                    ) : (
                                        invoices.map((inv) => {
                                             // Fix: Add locale to display logic
                                             const date = new Date(inv.due_date)
                                             const month = format(date, "MMMM", { locale: ptBR })
                                             const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
                                             const year = format(date, "yyyy")
                                             
                                             return (
                                                <SelectItem key={inv.id} value={inv.id}>
                                                    {capitalizedMonth} {year} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(inv.total_amount))}
                                                </SelectItem>
                                             )
                                        })
                                    )}
                                </SelectContent>
                             </Select>
                         </div>
                     )}
                 </div>
             )}

             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Pagamento de Fatura..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                 Cancelar
               </Button>
               <Button type="submit" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Confirmar Pagamento
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
