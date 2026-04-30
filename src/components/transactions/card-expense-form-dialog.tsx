"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, CreditCard, AlertCircle, PlusCircle, CornerDownRight } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { api } from "@/services/apiClient"
import { Category } from "@/types/categories"
import { CreditCard as CreditCardType } from "@/types/cards"

import { Transaction } from "@/types/transactions"

import { TagSelector } from "@/components/tags/TagSelector"
import { LucideIcon } from "@/components/ui/icon-picker"
import { MoneyInput } from "@/components/ui/money-input"
import { CategoryForm } from "@/components/categories/CategoryForm"

const formSchema = z.object({
  description: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
  date: z.date(),
  category_id: z.string().min(1, "Selecione uma categoria."),
  card_id: z.string().min(1, "Selecione um cartão."),
  installments: z.coerce.number().min(1, "Mínimo de 1 parcela.").max(99, "Máximo de 99 parcelas.").default(1),
  update_scope: z.enum(["SINGLE", "ALL_FUTURE"]).optional(),
  tags: z.array(z.string()).default([]),
})

type FormValues = z.infer<typeof formSchema>

interface CardExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Transaction | null
}

export function CardExpenseFormDialog({ open, onOpenChange, onSuccess, initialData }: CardExpenseFormDialogProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CreditCardType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      description: "",
      amount: 0,
      category_id: "",
      card_id: "",
      installments: 1,
      update_scope: "SINGLE",
    },
  })
  
  const isEditingInstallment = initialData?.is_installment || (initialData?.installment_total || 0) > 1

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
        fetchResources()
        
        if (initialData) {
            // Edit Mode
            const [year, month, day] = initialData.date.split('-').map(Number);
            form.reset({
                description: initialData.description,
                amount: Number(initialData.amount),
                date: new Date(year, month - 1, day),
                category_id: (typeof initialData.category === 'object' ? (initialData.category as any).id : initialData.category) || initialData.category_detail?.id || "",
                card_id: (typeof initialData.credit_card === 'object' ? (initialData.credit_card as any).id : initialData.credit_card) || initialData.credit_card_detail?.id || "",
                installments: initialData.installment_total || 1,
                update_scope: "SINGLE",
                tags: initialData.tags?.map((t: any) => typeof t === 'string' ? t : t.id) || [],
            })
        } else {
            // Create Mode
            form.reset({
                description: "",
                amount: 0,
                date: new Date(),
                category_id: "",
                card_id: "",
                installments: 1,
                update_scope: "SINGLE",
                tags: [],
            })
        }
    }
  }, [open, initialData, form])

  const fetchResources = async () => {
      try {
          const [catRes, cardRes] = await Promise.all([
              api.get("/categories/?type=EXPENSE"),
              api.get("/credit-cards/")
          ])
          
          let rawCats: Category[] = catRes.data.results || catRes.data || []
          
          // Organizar hierarquicamente (Flattened)
          const organized: any[] = []
          rawCats.forEach(parent => {
              organized.push({ ...parent, isSubcategory: false })
              if (parent.subcategories) {
                  parent.subcategories.forEach(child => {
                      organized.push({
                          ...child,
                          isSubcategory: true,
                          parentIcon: parent.icon,
                          parentColor: parent.color
                      })
                  })
              }
          })
          
          setCategories(organized)
          setCards(cardRes.data.results || cardRes.data || [])
      } catch (error) {
          console.error("Failed to fetch resources", error)
          toast.error("Erro ao carregar dados.")
      }
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      const payload = {
          ...data,
          date: format(data.date, "yyyy-MM-dd"),
          type: initialData ? initialData.type : "CREDIT_CARD_EXPENSE"
      }
      
      // Backend expects 'credit_card' instead of 'card_id'
      const finalPayload = {
          ...payload,
          credit_card: payload.card_id,
          category: payload.category_id,
          tags: payload.tags
      }
      delete (finalPayload as any).card_id
      delete (finalPayload as any).category_id
      delete (finalPayload as any).installments // installments usually not editable directly or handled by backend
      
      if (initialData) {
          // Edit
          if (isEditingInstallment) {
              (finalPayload as any).update_scope = data.update_scope
          }

          await api.put(`/transactions/${initialData.id}/`, finalPayload)
          toast.success("Despesa atualizada com sucesso!")
      } else {
          // Create - Installments matters here
          // Re-add installments for Create
           (finalPayload as any).installments = data.installments

          await api.post("/transactions/credit-card-expense/", finalPayload)
          toast.success("Despesa registrada com sucesso!")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error submitting card expense:", error)
      if (error.response) {
          console.error("Server Response Status:", error.response.status)
          console.error("Server Response Data:", error.response.data)
      }
      toast.error("Erro ao salvar despesa. Verifique os dados.")
    } finally {
      setIsLoading(false)
    }
  }

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
        <div className="h-2 w-full bg-orange-500" />
        
        <div className="p-8 pt-6">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-orange-100 text-orange-600 dark:bg-orange-500/10 animate-in zoom-in-50 duration-500">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {initialData ? "Editar Despesa" : "Novo Gasto no Cartão"}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium opacity-70">
                  {initialData ? "Atualize os detalhes da transação no cartão." : "Registre uma compra feita no crédito."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <Form {...form}>
            <form 
                onSubmit={form.handleSubmit(onSubmit, (err) => console.error("Card Expense Validation Errors:", err))} 
                className="space-y-6"
            >
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Descrição do Gasto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Assinatura Netflix, Jantar..." 
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
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Valor Total</FormLabel>
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-2">Data da Compra</FormLabel>
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
                        name="card_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Cartão Utilizado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-12 px-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl shadow-xl">
                                    {cards.map((card) => (
                                        <SelectItem key={card.id} value={card.id} className="rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-black/5" 
                                                    style={{ backgroundColor: card.color || "#ccc" }} 
                                                />
                                                <span className="font-medium">{card.name}</span>
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
                                <SelectContent className="rounded-[32px] border-border/60 shadow-2xl max-h-[450px] p-2 bg-card">
                                    <div className="flex flex-col">
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            className="w-full justify-start gap-3 h-14 rounded-2xl text-primary hover:bg-primary/10 hover:text-primary transition-all font-black text-[10px] uppercase tracking-[0.1em] mb-2 group"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setIsCategoryDialogOpen(true)
                                            }}
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-primary/20 group-hover:scale-110 transition-transform">
                                                <PlusCircle className="h-5 w-5" />
                                            </div>
                                            Nova Categoria
                                        </Button>

                                        <div className="px-2 mb-2">
                                            <Separator className="bg-muted/20" />
                                        </div>

                                        {categories.map((cat: any, index: number) => {
                                            const isMaster = !cat.isSubcategory;
                                            const isFirstMaster = isMaster && !categories.slice(0, index).some((c: any) => !c.isSubcategory);
                                            const showSeparator = isMaster && !isFirstMaster;
                                                
                                                return (
                                                    <div key={cat.id}>
                                                        {showSeparator && (
                                                            <div className="px-2 my-2">
                                                                <Separator className="bg-muted/20" />
                                                            </div>
                                                        )}
                                                        <SelectItem 
                                                            key={cat.id} 
                                                            value={cat.id} 
                                                            className={cn(
                                                                "group rounded-2xl transition-all duration-300 cursor-pointer mb-1 hover:bg-muted/30",
                                                                cat.isSubcategory ? "pl-2 py-2" : "py-3"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "flex items-center gap-3",
                                                                cat.isSubcategory && "pl-8"
                                                            )}>
                                                                {cat.isSubcategory && (
                                                                    <div className="flex items-center shrink-0">
                                                                        <CornerDownRight className="h-3 w-3 text-muted-foreground/30 mr-2" />
                                                                    </div>
                                                                )}
                                                                
                                                                <div 
                                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-data-[highlighted]:scale-110"
                                                                    style={{ 
                                                                        backgroundColor: `${cat.color}15`, 
                                                                        color: cat.color 
                                                                    }}
                                                                >
                                                                    <div className="absolute inset-0 rounded-xl bg-current opacity-0 group-data-[highlighted]:opacity-10 transition-opacity" />
                                                                    <LucideIcon name={cat.icon || "Tag"} className="h-5 w-5 relative z-10" />
                                                                </div>

                                                                <div className="flex flex-col">
                                                                    <span className={cn(
                                                                        "tracking-tight transition-colors",
                                                                        cat.isSubcategory 
                                                                            ? "font-black text-[10px] uppercase text-muted-foreground/50 group-data-[highlighted]:text-slate-900" 
                                                                            : "font-black text-sm uppercase group-data-[highlighted]:text-slate-950"
                                                                    )}>
                                                                        {cat.name}
                                                                    </span>
                                                                    {!cat.isSubcategory && (
                                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 group-data-[highlighted]:text-slate-800 -mt-0.5">Categoria Master</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                </SelectContent>
                            </Select>
                            <FormMessage className="ml-1 text-[11px]" />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {!initialData && (
                        <FormField
                            control={form.control}
                            name="installments"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Parcelas</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        min="1" 
                                        max="99" 
                                        placeholder="1" 
                                        {...field} 
                                        className="h-12 px-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all text-base"
                                    />
                                </FormControl>
                                <FormMessage className="ml-1 text-[11px]" />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                {isEditingInstallment && (
                    <FormField
                      control={form.control}
                      name="update_scope"
                      render={({ field }) => (
                        <div className="space-y-3 p-5 rounded-[32px] bg-amber-500/15 border border-amber-500/40 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                            <div className="flex items-center gap-2">
                               <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                               <Label className="text-xs font-bold uppercase tracking-tight text-amber-700 dark:text-amber-400">Edição de Parcelas</Label>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <Label className="text-[13px] opacity-80">Aplicar alterações para:</Label>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-9 w-[180px] rounded-xl bg-background border-amber-500/20">
                                          <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl shadow-xl border-amber-500/20 text-xs text-balance">
                                        <SelectItem value="SINGLE" className="rounded-lg">Apenas nesta parcela</SelectItem>
                                        <SelectItem value="ALL_FUTURE" className="rounded-lg">Nesta e nas próximas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                      )}
                    />
                )}
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
                    className="h-12 px-8 rounded-2xl font-bold bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {initialData ? "Salvar Alterações" : "Adicionar Despesa"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>

      {/* Modal Secundário: Nova Categoria */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-8">
                <DialogHeader className="mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
                            <PlusCircle className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                            <DialogTitle className="text-2xl font-black tracking-tight">Nova Categoria</DialogTitle>
                            <DialogDescription className="text-xs font-bold opacity-50 tracking-tight">Crie uma categoria personalizada agora mesmo.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <CategoryForm 
                    defaultType="EXPENSE"
                    onSuccess={() => {
                        setIsCategoryDialogOpen(false)
                        fetchResources()
                    }}
                    onCancel={() => setIsCategoryDialogOpen(false)}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
