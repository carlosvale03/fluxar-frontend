"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, ArrowRightCircle, PlusCircle, Wallet } from "lucide-react"
import { Separator } from "@/components/ui/separator"
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
import { deCentavos, maiorQueZero, paraCentavos } from "@/lib/dinheiro"

import { api } from "@/services/apiClient"
import { Account, AccountTypeLabels } from "@/types/accounts"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"

import { Transaction } from "@/types/transactions"

import { TagSelector } from "@/components/tags/TagSelector"
import { usePlan } from "@/hooks/use-plan"

import { MoneyInput } from "@/components/ui/money-input"
import { tratarErro } from "@/lib/erros"

const formSchema = z.object({
  description: z.string().optional(),
  // CONTRATO-17: o valor vai à API como texto decimal ("1234.56")
  amount: z.string().refine(maiorQueZero, "O valor deve ser maior que 0."),
  date: z.date(),
  source_account_id: z.string().min(1, "Selecione a conta de origem."),
  target_account_id: z.string().min(1, "Selecione a conta de destino."),
  tags: z.array(z.string()).default([]),
}).refine(data => data.source_account_id !== data.target_account_id, {
    message: "A conta de destino deve ser diferente da origem.",
    path: ["target_account_id"],
})

type FormValues = z.infer<typeof formSchema>

interface TransferFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Transaction | null
}

export function TransferFormDialog({ open, onOpenChange, onSuccess, initialData }: TransferFormDialogProps) {
  // PERM-19: o campo de tags some com `tags` fechado
  const tagsLiberadas = usePlan().podeUsar("tags") === true
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      description: "",
      amount: "",
      source_account_id: "",
      target_account_id: "",
    },
  })
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
        fetchAccounts()
        
        if (initialData) {
            // Edit mode: We need to fetch full details to get the target account (account_to)
            // The list view transaction object typically only has 'account' (which is source)
            fetchTransactionDetails(initialData.id)
        } else {
            // Create mode
            form.reset({
                description: "",
                amount: "",
                date: new Date(),
                source_account_id: "",
                target_account_id: "",
                tags: [],
            })
        }
    }
  }, [open, initialData, form])

  const fetchTransactionDetails = async (id: string) => {
      setIsFetchingDetails(true)
      try {
          const response = await api.get(`/transactions/${id}/`)
          const data = response.data
          
          console.log("Transfer Main Details:", data)
          console.log("Keys:", Object.keys(data))

          let sourceId = ""
          let targetId = ""
          
          let partnerTransaction = null

          // Determine Partner ID
          let partnerId = null
          if (data.related_transaction) {
               if (typeof data.related_transaction === 'object') {
                   // V2 Backend returns { id: string, ... }
                   partnerId = data.related_transaction.id
               } else {
                   partnerId = data.related_transaction
               }
          } else if (data.transfer_id) {
               console.log("Looking up partner via transfer_id:", data.transfer_id)
               try {
                  const listRes = await api.get(`/transactions/?transfer_id=${data.transfer_id}`)
                  const results = listRes.data.results
                  if (Array.isArray(results)) {
                      const found = results.find((t: any) => t.id !== data.id)
                      if (found) partnerId = found.id
                  }
               } catch (err) {
                   // CONTRATO-33: nenhuma falha silenciosa
                   tratarErro(err, { mensagemPadrao: "Erro ao carregar a outra perna da transferência." })
               }
          }

          // Fetch full partner details if we have an ID
          if (partnerId) {
              try {
                  const relatedRes = await api.get(`/transactions/${partnerId}/`)
                  partnerTransaction = relatedRes.data
                  console.log("Partner Transaction Fetched (Full):", partnerTransaction)
              } catch (err) {
                  tratarErro(err, { mensagemPadrao: "Erro ao carregar a outra perna da transferência." })
              }
          }

          const isOutgoing = data.type === 'TRANSFER_OUT' || data.type === 'TRANSFER' || (paraCentavos(data.amount) < 0 && data.type !== 'TRANSFER_IN');

          if (isOutgoing) {
              // OUTGOING: Main transaction is SOURCE
              sourceId = (typeof data.account === 'object' ? data.account.id : data.account) || data.account_from || ""
              if (partnerTransaction) {
                  // Partner is Target
                  targetId = (typeof partnerTransaction.account === 'object' ? partnerTransaction.account.id : partnerTransaction.account) || partnerTransaction.account_to || ""
              }
              // Fallback for Target if still missing
              if (!targetId) targetId = data.account_to || data.target_account || ""
          } else {
              // INCOMING: Main transaction is TARGET
              targetId = (typeof data.account === 'object' ? data.account.id : data.account) || data.account_to || ""
              if (partnerTransaction) {
                   // Partner is Source
                  sourceId = (typeof partnerTransaction.account === 'object' ? partnerTransaction.account.id : partnerTransaction.account) || partnerTransaction.account_from || ""
              }
              // Fallback for Source if still missing
              if (!sourceId) sourceId = data.account_from || data.source_account || ""
          }
          
          console.log(`Resolved Accounts - Source: ${sourceId}, Target: ${targetId}`)

          const [year, month, day] = data.date.split('-').map(Number);
          
          form.reset({
              description: data.description,
              amount: deCentavos(Math.abs(paraCentavos(data.amount))),
              date: new Date(year, month - 1, day),
              source_account_id: sourceId,
              target_account_id: targetId,
              tags: data.tags?.map((t: any) => typeof t === 'string' ? t : t.id) || [],
          })
      } catch (error) {
          console.error("Failed to fetch transfer details", error)
          toast.error("Erro ao carregar detalhes da transferência.")
      } finally {
          setIsFetchingDetails(false)
      }
  }
          

  const fetchAccounts = async () => {
      try {
          const response = await api.get("/accounts/")
          setAccounts(response.data)
      } catch (error) {
          console.error("Failed to fetch accounts", error)
          toast.error("Erro ao carregar contas.")
      }
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      const formattedDate = format(data.date, "yyyy-MM-dd")
      
      if (initialData) {
          // Edit
          // Ensure correct sign for the transaction being edited
          // Backend V2 expects absolute value and handles sign by type/signed_amount
          const amount = deCentavos(Math.abs(paraCentavos(data.amount)))

          
          // O backend usa `account` como a conta da perna editada e
          // `target_account_id` como a da outra perna (SALDO-13, SALDO-14).
          // Editando a saída, a perna é a origem; editando a entrada, é o destino.
          
          let accountIdParam = ""
          let targetAccountIdParam = ""

          const isOutgoing = initialData.type === 'TRANSFER_OUT' || initialData.type === 'TRANSFER' || (paraCentavos(initialData.amount) < 0 && initialData.type !== 'TRANSFER_IN');

          if (isOutgoing) {
              accountIdParam = data.source_account_id
              targetAccountIdParam = data.target_account_id
          } else {
              accountIdParam = data.target_account_id
              targetAccountIdParam = data.source_account_id
          }

          const editPayload = {
              description: data.description,
              amount: amount, 
              date: formattedDate,
              account: accountIdParam,
              target_account_id: targetAccountIdParam,
              type: initialData.type,
              tags: data.tags
          }

          await api.put(`/transactions/${initialData.id}/`, editPayload)
          toast.success("Transferência atualizada.")
      } else {
          // Create - Expects different field names
          const createPayload = {
              description: data.description || "Transferência",
              amount: data.amount,
              date: formattedDate,
              account_from: data.source_account_id,
              account_to: data.target_account_id,
              type: "TRANSFER",
              tags: data.tags
          }

          await api.post("/transactions/transfer/", createPayload)
          toast.success("Transferência realizada.")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo; o resto, ao Sonner
      tratarErro(error, {
        form,
        campos: {
          description: "description",
          amount: "amount",
          date: "date",
          account_from: "source_account_id",
          account_to: "target_account_id",
          tags: "tags",
        },
        mensagemPadrao: "Erro ao salvar transferência. Verifique os dados.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-info">
                <ArrowRightCircle className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle>
                  {initialData ? "Editar Transferência" : "Nova Transferência"}
                </DialogTitle>
                <DialogDescription>
                  {initialData ? "Atualize os detalhes da movimentação." : "Mova valores entre suas contas de forma simples."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {isFetchingDetails ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground" role="status">Carregando detalhes...</p>
              </div>
          ) : (
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit(onSubmit, (err) => console.error("Transfer Validation Errors:", err))} 
                className="space-y-6"
              >
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo / Descrição</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Reserva, Investimento..." 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {tagsLiberadas && (
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <TagSelector
                            selectedTagIds={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}

                  {/* Amount and Date row */}
                  <div className="grid grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Quanto?</FormLabel>
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
                          <FormItem className="flex flex-col">
                          <FormLabel>Quando?</FormLabel>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                              <PopoverTrigger asChild>
                              <FormControl>
                                  <Button
                                  variant={"outline"}
                                  className={cn(
                                      "w-full justify-start font-normal",
                                      !field.value && "text-muted-foreground"
                                  )}
                                  >
                                  {field.value ? (
                                      format(field.value, "dd 'de' MMM", { locale: ptBR })
                                  ) : (
                                      <span>Data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                  </Button>
                              </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    field.onChange(date)
                                    setIsCalendarOpen(false)
                                  }}
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

                  {/* Visual Flow Container */}
                  <div className="relative rounded-lg border border-border p-4">
                    <div aria-hidden="true" className="absolute left-1/2 top-1/2 z-10 hidden h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-elevated text-info sm:flex">
                      <ArrowRightCircle className="h-4 w-4" />
                    </div>

                    <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-10">
                      <FormField
                          control={form.control}
                          name="source_account_id"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Sai de:</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Origem..." />
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

                      <FormField
                          control={form.control}
                          name="target_account_id"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Entra em:</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Destino..." />
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
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={isLoading}>
                    {initialData ? "Salvar Alterações" : "Efetuar Transferência"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

