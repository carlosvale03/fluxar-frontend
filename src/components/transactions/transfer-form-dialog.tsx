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

import { api } from "@/services/apiClient"
import { Account, AccountTypeLabels } from "@/types/accounts"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"

import { Transaction } from "@/types/transactions"

import { TagSelector } from "@/components/tags/TagSelector"

import { MoneyInput } from "@/components/ui/money-input"

const formSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      description: "",
      amount: 0,
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
                amount: 0,
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
                  const results = listRes.data.results || listRes.data
                  if (Array.isArray(results)) {
                      const found = results.find((t: any) => t.id !== data.id)
                      if (found) partnerId = found.id
                  }
               } catch (err) {
                   console.error("Failed to lookup by transfer_id", err)
               }
          }

          // Fetch full partner details if we have an ID
          if (partnerId) {
              try {
                  const relatedRes = await api.get(`/transactions/${partnerId}/`)
                  partnerTransaction = relatedRes.data
                  console.log("Partner Transaction Fetched (Full):", partnerTransaction)
              } catch (err) {
                  console.error("Failed to fetch related transaction full details", err)
              }
          }

          const isOutgoing = data.type === 'TRANSFER_OUT' || data.type === 'TRANSFER' || (data.amount < 0 && data.type !== 'TRANSFER_IN');

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
              amount: Math.abs(Number(data.amount)),
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
          setAccounts(response.data.results || response.data || [])
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
          let amount = Math.abs(data.amount) // Backend V2 expects absolute value and handles sign by type/signed_amount

          
          // Determine accounts based on direction (Source vs Target)
          // If editing OUTGOING (Source), 'account_id' is Source, 'target_account_id' is Partner (Target)
          // If editing INCOMING (Target), 'account_id' is Target, 'target_account_id' is Partner (Source)
          
          let accountIdParam = ""
          let targetAccountIdParam = ""

          const isOutgoing = initialData.type === 'TRANSFER_OUT' || initialData.type === 'TRANSFER' || (initialData.amount < 0 && initialData.type !== 'TRANSFER_IN');

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
              account_id: accountIdParam,
              target_account_id: targetAccountIdParam,
              type: initialData.type,
              tags: data.tags
          }

          await api.put(`/transactions/${initialData.id}/`, editPayload)
          toast.success("Transferência atualizada com sucesso!")
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
          toast.success("Transferência realizada com sucesso!")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error submitting transfer:", error)
      if (error.response) {
          console.error("Server Response Status:", error.response.status)
          console.error("Server Response Data:", error.response.data)
      }
      toast.error("Erro ao salvar transferência. Verifique os dados.")
    } finally {
      setIsLoading(false)
    }
  }

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
        <div className="h-2 w-full bg-blue-500" />
        
        <div className="p-8 pt-6">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-500/10 animate-in zoom-in-50 duration-500">
                <ArrowRightCircle className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {initialData ? "Editar Transferência" : "Nova Transferência"}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium opacity-70">
                  {initialData ? "Atualize os detalhes da movimentação." : "Mova valores entre suas contas de forma simples."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {isFetchingDetails ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                  <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando detalhes...</p>
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Motivo / Descrição</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Reserva, Investimento..." 
                            {...field} 
                            className="h-12 px-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all text-base"
                          />
                        </FormControl>
                        <FormMessage className="ml-1 text-[11px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem className="space-y-2 !mb-2">
                        <FormControl>
                          <TagSelector 
                            selectedTagIds={field.value} 
                            onChange={field.onChange} 
                          />
                        </FormControl>
                        <FormMessage className="ml-1 text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Amount and Date row */}
                  <div className="grid grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Quanto?</FormLabel>
                              <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                                    <MoneyInput 
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="h-12 pl-10 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all font-bold text-lg"
                                    />
                                  </div>
                              </FormControl>
                              <FormMessage className="ml-1 text-[11px]" />
                              </FormItem>
                          )}
                      />

                      <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                          <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-2">Quando?</FormLabel>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                              <PopoverTrigger asChild>
                              <FormControl>
                                  <Button
                                  variant={"outline"}
                                  className={cn(
                                      "h-12 px-4 rounded-2xl border-muted/60 bg-muted/20 hover:bg-muted/30 focus:ring-2 focus:ring-primary/20 transition-all text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                  )}
                                  >
                                  {field.value ? (
                                      format(field.value, "dd 'de' MMM", { locale: ptBR })
                                  ) : (
                                      <span>Data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                              </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden shadow-2xl border-muted/60" align="start">
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
                          <FormMessage className="ml-1 text-[11px]" />
                          </FormItem>
                      )}
                      />
                  </div>

                  {/* Visual Flow Container */}
                  <div className="relative flex flex-col gap-4 p-6 rounded-[32px] bg-muted/10 border border-muted/30 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 z-10">
                      <ArrowRightCircle className="h-4 w-4" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative">
                      <FormField
                          control={form.control}
                          name="source_account_id"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-rose-500 ml-1">Sai de:</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                  <SelectTrigger className="h-12 px-4 rounded-2xl border-muted/60 bg-background focus:ring-2 focus:ring-rose-500/20 transition-all">
                                      <SelectValue placeholder="Origem..." />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-[32px] border-border/60 shadow-2xl max-h-[450px] p-2 bg-card">
                                       <div className="flex flex-col">
                                           <AccountFormDialog 
                                               onSuccess={() => fetchAccounts()}
                                               trigger={
                                                   <Button 
                                                       type="button"
                                                       variant="ghost" 
                                                       className="w-full justify-start gap-3 h-14 rounded-2xl text-primary hover:bg-primary/10 hover:text-primary transition-all font-black text-[10px] uppercase tracking-[0.1em] mb-2 group"
                                                   >
                                                       <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-primary/20 group-hover:scale-110 transition-transform">
                                                           <PlusCircle className="h-5 w-5" />
                                                       </div>
                                                       Nova Conta
                                                   </Button>
                                               }
                                           />

                                           <div className="px-2 mb-2">
                                               <Separator className="bg-muted/20" />
                                           </div>

                                           {["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].map((type, typeIndex) => {
                                               const groupAccounts = accounts.filter(acc => acc.is_active && acc.type === type);
                                               if (groupAccounts.length === 0) return null;

                                               return (
                                                   <div key={type}>
                                                       {typeIndex > 0 && accounts.some(acc => acc.is_active && ["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].slice(0, typeIndex).includes(acc.type)) && (
                                                           <div className="px-2 my-2">
                                                               <Separator className="bg-muted/20" />
                                                           </div>
                                                       )}
                                                       <div className="px-3 py-1 mb-1">
                                                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
                                                               {AccountTypeLabels[type as keyof typeof AccountTypeLabels]}
                                                           </span>
                                                       </div>
                                                       {groupAccounts.map((acc) => (
                                                           <SelectItem 
                                                               key={acc.id} 
                                                               value={acc.id} 
                                                               className="group rounded-2xl transition-all duration-300 cursor-pointer mb-1 hover:bg-muted/30 py-3"
                                                           >
                                                               <div className="flex items-center gap-3">
                                                                   <div 
                                                                       className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-data-[highlighted]:scale-110"
                                                                       style={{ 
                                                                           backgroundColor: `${acc.color}15`, 
                                                                           color: acc.color 
                                                                       }}
                                                                   >
                                                                       <div className="absolute inset-0 rounded-xl bg-current opacity-0 group-data-[highlighted]:opacity-10 transition-opacity" />
                                                                       <Wallet className="h-5 w-5 relative z-10" />
                                                                   </div>

                                                                   <div className="flex flex-col text-left">
                                                                       <span className="font-black text-sm uppercase tracking-tight group-data-[highlighted]:text-slate-950 transition-colors">
                                                                           {acc.name}
                                                                       </span>
                                                                       <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 group-data-[highlighted]:text-slate-800 -mt-0.5">
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
                              <FormMessage className="ml-1 text-[11px]" />
                              </FormItem>
                          )}
                      />

                      <FormField
                          control={form.control}
                          name="target_account_id"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-emerald-500 ml-1">Entra em:</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                  <SelectTrigger className="h-12 px-4 rounded-2xl border-muted/60 bg-background focus:ring-2 focus:ring-emerald-500/20 transition-all">
                                      <SelectValue placeholder="Destino..." />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-[32px] border-border/60 shadow-2xl max-h-[450px] p-2 bg-card">
                                       <div className="flex flex-col">
                                           <AccountFormDialog 
                                               onSuccess={() => fetchAccounts()}
                                               trigger={
                                                   <Button 
                                                       type="button"
                                                       variant="ghost" 
                                                       className="w-full justify-start gap-3 h-14 rounded-2xl text-primary hover:bg-primary/10 hover:text-primary transition-all font-black text-[10px] uppercase tracking-[0.1em] mb-2 group"
                                                   >
                                                       <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-primary/20 group-hover:scale-110 transition-transform">
                                                           <PlusCircle className="h-5 w-5" />
                                                       </div>
                                                       Nova Conta
                                                   </Button>
                                               }
                                           />

                                           <div className="px-2 mb-2">
                                               <Separator className="bg-muted/20" />
                                           </div>

                                           {["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].map((type, typeIndex) => {
                                               const groupAccounts = accounts.filter(acc => acc.is_active && acc.type === type);
                                               if (groupAccounts.length === 0) return null;

                                               return (
                                                   <div key={type}>
                                                       {typeIndex > 0 && accounts.some(acc => acc.is_active && ["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].slice(0, typeIndex).includes(acc.type)) && (
                                                           <div className="px-2 my-2">
                                                               <Separator className="bg-muted/20" />
                                                           </div>
                                                       )}
                                                       <div className="px-3 py-1 mb-1">
                                                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
                                                               {AccountTypeLabels[type as keyof typeof AccountTypeLabels]}
                                                           </span>
                                                       </div>
                                                       {groupAccounts.map((acc) => (
                                                           <SelectItem 
                                                               key={acc.id} 
                                                               value={acc.id} 
                                                               className="group rounded-2xl transition-all duration-300 cursor-pointer mb-1 hover:bg-muted/30 py-3"
                                                           >
                                                               <div className="flex items-center gap-3">
                                                                   <div 
                                                                       className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-data-[highlighted]:scale-110"
                                                                       style={{ 
                                                                           backgroundColor: `${acc.color}15`, 
                                                                           color: acc.color 
                                                                       }}
                                                                   >
                                                                       <div className="absolute inset-0 rounded-xl bg-current opacity-0 group-data-[highlighted]:opacity-10 transition-opacity" />
                                                                       <Wallet className="h-5 w-5 relative z-10" />
                                                                   </div>

                                                                   <div className="flex flex-col text-left">
                                                                       <span className="font-black text-sm uppercase tracking-tight group-data-[highlighted]:text-slate-950 transition-colors">
                                                                           {acc.name}
                                                                       </span>
                                                                       <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 group-data-[highlighted]:text-slate-800 -mt-0.5">
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
                              <FormMessage className="ml-1 text-[11px]" />
                              </FormItem>
                          )}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => onOpenChange(false)}
                      className="h-12 px-6 rounded-2xl font-semibold hover:bg-muted"
                  >
                    Cancelar
                  </Button>
                  <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="h-12 px-8 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

