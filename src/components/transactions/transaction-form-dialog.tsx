"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, Plus, Repeat, ArrowUpCircle, ArrowDownCircle, AlertCircle } from "lucide-react"
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
import { TagSelector } from "@/components/tags/TagSelector"
import { LucideIcon } from "@/components/ui/icon-picker"

const formSchema = z.object({
  description: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
  date: z.date(),
  category_id: z.string().min(1, "Selecione uma categoria."),
  account_id: z.string().min(1, "Selecione uma conta."),
  type: z.enum(["INCOME", "EXPENSE"]),
  is_recurring: z.boolean().default(false).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  tags: z.array(z.string()).default([]),
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
                tags: initialData.tags?.map((t: any) => typeof t === 'string' ? t : t.id) || [],
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
                tags: [],
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
          
          let rawCats: Category[] = catRes.data.results || catRes.data || []
          
          // Organizar hierarquicamente (Flattened)
          const organized: Category[] = []
          rawCats.forEach(parent => {
              organized.push(parent)
              if (parent.subcategories) {
                  parent.subcategories.forEach(child => {
                      organized.push({
                          ...child,
                          name: `↳ ${child.name}`
                      })
                  })
              }
          })
          
          setCategories(organized)
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
          tags: payload.tags,
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
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
        <div className={cn(
          "h-2 w-full",
          type === "INCOME" ? "bg-emerald-500" : "bg-rose-500"
        )} />
        
        <div className="p-8 pt-6">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center animate-in zoom-in-50 duration-500",
                type === "INCOME" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-100 text-rose-600 dark:bg-rose-500/10"
              )}>
                {type === "INCOME" ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                    {initialData 
                        ? (type === "INCOME" ? "Editar Receita" : "Editar Despesa")
                        : (type === "INCOME" ? "Nova Receita" : "Nova Despesa")
                    }
                </DialogTitle>
                <DialogDescription className="text-sm font-medium opacity-70">
                  {initialData ? "Atualize os detalhes da transação." : "Registre uma nova movimentação financeira."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">O que é isso?</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Salário, Aluguel, Mercado..." 
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
                                  <Input 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="0,00" 
                                      {...field} 
                                      onFocus={(e) => e.target.select()}
                                      className="h-12 pl-10 pr-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all text-base font-bold"
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

                <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Categoria</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-12 px-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl shadow-xl max-h-[300px]">
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                                >
                                                    <LucideIcon name={cat.icon} className="h-4 w-4" />
                                                </div>
                                                <span className={cn(
                                                    cat.name.startsWith("↳") ? "text-muted-foreground ml-1" : "font-medium"
                                                )}>
                                                    {cat.name}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="ml-1 text-[11px]" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="account_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Conta</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-12 px-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl shadow-xl">
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id} className="rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-black/5" 
                                                    style={{ backgroundColor: acc.color || "#ccc" }} 
                                                />
                                                <span className="font-medium">{acc.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="ml-1 text-[11px]" />
                            </FormItem>
                        )}
                    />
                </div>

              </div>

              {/* Recurring Update Scope - only show when editing a recurring transaction */}
              {initialData?.recurring_source && (
                  <div className="space-y-3 p-5 rounded-[32px] bg-amber-500/15 border border-amber-500/40 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        <Label className="text-xs font-bold uppercase tracking-tight text-amber-700 dark:text-amber-400">Edição Recurrente</Label>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                          <Label className="text-[13px] opacity-80">Aplicar alterações para:</Label>
                          <Select 
                              value={updateScope} 
                              // @ts-ignore
                              onValueChange={setUpdateScope}
                          >
                              <SelectTrigger className="h-9 w-[160px] rounded-xl bg-background border-amber-500/20">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-xl border-amber-500/20 text-xs">
                                  <SelectItem value="SINGLE" className="rounded-lg">Apenas este lançamento</SelectItem>
                                  <SelectItem value="ALL" className="rounded-lg">Este e os próximos</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
              )}

              {/* Recurrence Selection (Only for new transactions or non-recurring) */}
              {!initialData?.recurring_source && (
              <div className={cn(
                  "flex flex-col gap-4 p-5 rounded-[32px] transition-all duration-300 border",
                  form.watch("is_recurring") 
                    ? "bg-violet-600/10 border-violet-500/40 shadow-sm" 
                    : "bg-muted/30 border-muted/50"
              )}>
                  <FormField
                      control={form.control}
                      name="is_recurring"
                      render={({ field }) => (
                          <FormItem>
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                                      field.value 
                                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 ring-4 ring-violet-500/10" 
                                        : "bg-muted-foreground/30 text-muted-foreground border border-muted-foreground/30"
                                    )}>
                                      <Repeat className={cn("h-4 w-4", field.value && "animate-spin-slow")} />
                                    </div>
                                    <FormLabel className="font-bold cursor-pointer text-sm text-foreground/80">
                                        Repetir Transação
                                    </FormLabel>
                                  </div>
                                  <FormControl>
                                      <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          className="data-[state=unchecked]:bg-muted-foreground/40 data-[state=checked]:bg-violet-600"
                                      />
                                  </FormControl>
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
                              <FormItem className="animate-in slide-in-from-top-4 duration-500">
                                  <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                          <SelectTrigger className="h-10 rounded-xl bg-background border-muted/60">
                                              <SelectValue placeholder="Selecione a frequência..." />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="rounded-xl shadow-xl">
                                          <SelectItem value="DAILY" className="rounded-lg">Diariamente</SelectItem>
                                          <SelectItem value="WEEKLY" className="rounded-lg">Semanalmente</SelectItem>
                                          <SelectItem value="MONTHLY" className="rounded-lg">Mensalmente</SelectItem>
                                          <SelectItem value="YEARLY" className="rounded-lg">Anualmente</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  )}
              </div>
              )}


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
                    className={cn(
                      "h-12 px-8 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all",
                      type === "INCOME" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
                    )}
                 >
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {initialData ? "Salvar Alterações" : (type === "INCOME" ? "Adicionar Receita" : "Adicionar Despesa")}
                 </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
