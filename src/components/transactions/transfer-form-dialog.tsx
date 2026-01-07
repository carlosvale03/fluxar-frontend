"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, ArrowRightCircle } from "lucide-react"
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

import { Transaction } from "@/types/transactions"

const formSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
  date: z.date(),
  source_account_id: z.string().min(1, "Selecione a conta de origem."),
  target_account_id: z.string().min(1, "Selecione a conta de destino."),
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
              sourceId = data.account || data.account_from || ""
              if (partnerTransaction) {
                  // Partner is Target
                  targetId = partnerTransaction.account || partnerTransaction.account_to || ""
              }
              // Fallback for Target if still missing
              if (!targetId) targetId = data.account_to || data.target_account || ""
          } else {
              // INCOMING: Main transaction is TARGET
              targetId = data.account || data.account_to || ""
              if (partnerTransaction) {
                   // Partner is Source
                  sourceId = partnerTransaction.account || partnerTransaction.account_from || ""
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
              type: initialData.type
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
              type: "TRANSFER"
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5 text-blue-500" />
            {initialData ? "Editar Transferência" : "Nova Transferência"}
          </DialogTitle>
          <DialogDescription>
            {initialData ? "Altere os dados da transferência." : "Mova dinheiro entre suas contas."}
          </DialogDescription>
        </DialogHeader>
        
        {isFetchingDetails ? (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
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
                    render={({ field }) => {
                        // eslint-disable-next-line
                        const [isCalendarOpen, setIsCalendarOpen] = useState(false)
                        return (
                        <FormItem className="flex flex-col mt-2.5">
                        <FormLabel>Data</FormLabel>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                                // @ts-ignore
                                onClose={() => setIsCalendarOpen(false)}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="source_account_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Origem (Sai)</FormLabel>
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

                    <FormField
                        control={form.control}
                        name="target_account_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Destino (Entra)</FormLabel>
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

                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Investimento, Reserva..." {...field} />
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
                    {initialData ? "Salvar Alterações" : "Transferir"}
                </Button>
                </DialogFooter>
            </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

