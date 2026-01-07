"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, Plus, Repeat } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

import { api } from "@/services/apiClient"
import { TransactionType } from "@/types/transactions"
import { Category } from "@/types/categories"
import { Account } from "@/types/accounts"
const formSchema = z.object({
  description: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
  date: z.date(),
  category_id: z.string().min(1, "Selecione uma categoria."),
  account_id: z.string().min(1, "Selecione uma conta."),
  type: z.enum(["INCOME", "EXPENSE"]),
  is_recurring: z.boolean().default(false).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
}).refine((data) => {
  if (data.is_recurring && !data.frequency) {
    return false;
  }
  return true;
}, {
  message: "Selecione uma frequência de repetição.",
  path: ["frequency"],
})

type FormValues = z.infer<typeof formSchema>

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  type: "INCOME" | "EXPENSE"
  initialData?: any // Using any to avoid strict type conflicts for now, or use Transaction
}

export function TransactionFormDialog({ open, onOpenChange, onSuccess, type, initialData }: TransactionFormDialogProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false) // Controlled calendar state
  const [updateScope, setUpdateScope] = useState<"SINGLE" | "ALL">("SINGLE")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      description: "",
      amount: 0,
      type: type,
      category_id: "",
      account_id: "",
    },
  })
  
  // Reset form when type changes or dialog opens
  useEffect(() => {
    if (open) {
        if (initialData) {
            // Edit mode
            const [year, month, day] = initialData.date.split('-').map(Number);
            form.reset({
                description: initialData.description,
                amount: Number(initialData.amount),
                date: new Date(year, month - 1, day),
                type: initialData.type,
                category_id: initialData.category || "",
                account_id: initialData.account || "",
            })
        } else {
            // Create mode
            form.reset({
                description: "",
                amount: 0,
                date: new Date(),
                type: type,
                category_id: "",
                account_id: "",
                is_recurring: false,
                frequency: undefined,
            })
        }
        fetchDependencies()
    }
  }, [open, type, initialData, form])

  const fetchDependencies = async () => {
      try {
          const [catRes, accRes] = await Promise.all([
              api.get(`/categories/?type=${type}`),
              api.get("/accounts/")
          ])
          setCategories(catRes.data.results || catRes.data || [])
          console.log(`Loaded categories for ${type}:`, catRes.data.results || catRes.data)
          setAccounts(accRes.data.results || accRes.data || [])
      } catch (error) {
          console.error("Failed to fetch dependencies", error)
          toast.error("Erro ao carregar categorias ou contas.")
      }
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      const payload = {
          ...data,
          date: format(data.date, "yyyy-MM-dd"), // Format date for API
      }
      
      const isEdit = !!initialData
      const endpoint = isEdit ? `/transactions/${initialData.id}/` : "/transactions/"
      
      // Ensure payload matches TransactionSerializer (account, category, etc are IDs)
      // The form sends category_id, account_id. The serializer expects 'account' and 'category' (foreign keys).
      const finalPayload = {
          ...payload,
          account: payload.account_id,
          category: payload.category_id,
      }
      // Remove mismatched keys if necessary, or just send them (extra keys usually ignored)
      delete (finalPayload as any).account_id
      delete (finalPayload as any).category_id

      // Recurring Edit Logic
      // @ts-ignore
      const isRecurringEdit = initialData?.recurring_source && initialData?.is_recurring !== undefined // Check strictly if it's a recurring instance
      
      // We need a state for scope, but since we are inside onSubmit, we need to know the user's choice.
      // We should really have captured this choice in the UI before submitting.
      // However, to avoid refactoring the whole form state right now, let's look at how we did it for Card Expenses.
      // CardExpenseFormDialog used a field in the form or separate state.
      // Let's assume we added a field 'update_scope' to the formSchema if we want to valid it, 
      // or just a separate state in the component.
      
      console.log("Submitting transaction final payload:", finalPayload)
      
      let response;
      if (isEdit) {
          // Check for recurrence scope (we need to access the state from the component scope, which isn't available here easily without hook form)
          // Wait, 'data' is passed to onSubmit. We need to add 'update_scope' to the form values or use a state reference.
          // Let's use the 'updateScope' state defined in the component (which we will add).
          
          // @ts-ignore
          if (updateScope === 'ALL' && initialData.recurring_source) {
               // Bulk Update
               const bulkPayload = {
                   recurring_source: initialData.recurring_source,
                   description: finalPayload.description,
                   amount: finalPayload.amount,
                   category: finalPayload.category,
                   account: finalPayload.account,
                   type: finalPayload.type
                   // Exclude date for bulk update usually, unless we want to move all dates (risky). 
                   // Backend message said: "Atualiza descrição, valor ou categoria". 
                   // Safest to exclude date.
               }
               response = await api.patch('/transactions/bulk-update/', bulkPayload)
               toast.success("Série recorrente atualizada com sucesso!")
          } else {
               response = await api.put(endpoint, finalPayload)
               toast.success(`${type === "INCOME" ? "Receita" : "Despesa"} atualizada com sucesso!`)
          }
      } else {
          response = await api.post(endpoint, finalPayload)
          toast.success(`${type === "INCOME" ? "Receita" : "Despesa"} registrada com sucesso!`)
      }

      console.log("Transaction success response:", response.data)
      
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error submitting transaction:", error)
      if (error.response) {
          console.error("Server Response Status:", error.response.status)
          console.error("Server Response Data:", error.response.data)
      }
      toast.error("Erro ao salvar transação. Verifique os dados.")
    } finally {
      setIsLoading(false)
    }
  }

  // Log form errors
  // console.log("Form Errors:", form.formState.errors)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
              {initialData 
                  ? (type === "INCOME" ? "Editar Receita" : "Editar Despesa")
                  : (type === "INCOME" ? "Nova Receita" : "Nova Despesa")
              }
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para registrar uma nova movimentação.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Salário, Mercado, Aluguel..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                render={({ field }) => (
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
                )}
                />
            </div>



            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
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
                    name="account_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Conta</FormLabel>
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

            {/* Recurring Update Scope - only show when editing a recurring transaction */}
            {initialData?.recurring_source && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-md border border-slate-100 dark:bg-zinc-900/50 dark:border-zinc-800">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Opções de Edição</Label>
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label className="text-sm font-normal">Aplicar alterações em:</Label>
                        <Select 
                            value={updateScope} 
                            // @ts-ignore
                            onValueChange={setUpdateScope}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SINGLE">Apenas nesta</SelectItem>
                                <SelectItem value="ALL">Todas as futuras</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Recurrence Selection (Only for new transactions or non-recurring) */}
            {!initialData?.recurring_source && (
            <div className="flex items-end gap-4">
                 <FormField
                    control={form.control}
                    name="is_recurring"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 mt-2">
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                    Repetir transação
                                </FormLabel>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                {form.watch("is_recurring") && (
                    <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>Frequência</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="DAILY">Diariamente</SelectItem>
                                        <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                                        <SelectItem value="MONTHLY">Mensalmente</SelectItem>
                                        <SelectItem value="YEARLY">Anualmente</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
            )}


            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                 Cancelar
               </Button>
               <Button type="submit" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Salvar
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
