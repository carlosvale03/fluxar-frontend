"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, CreditCard } from "lucide-react"
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
import { Category } from "@/types/categories"
import { CreditCard as CreditCardType } from "@/types/cards"

import { Transaction } from "@/types/transactions"

const formSchema = z.object({
  description: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
  date: z.date(),
  category_id: z.string().min(1, "Selecione uma categoria."),
  card_id: z.string().min(1, "Selecione um cartão."),
  installments: z.coerce.number().min(1, "Mínimo de 1 parcela.").max(99, "Máximo de 99 parcelas.").default(1),
  update_scope: z.enum(["SINGLE", "ALL_FUTURE"]).optional(),
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
                category_id: initialData.category_detail?.id || initialData.category || "",
                card_id: initialData.credit_card || "",
                installments: initialData.installment_total || 1,
                update_scope: "SINGLE",
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
          
          setCategories(catRes.data.results || catRes.data || [])
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
          category: payload.category_id
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-500" />
            {initialData ? "Editar Despesa (Cartão)" : "Nova Despesa no Cartão"}
          </DialogTitle>
          <DialogDescription>
            {initialData ? "Altere os dados da despesa." : "Registre compras feitas no crédito."}
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
                    <Input placeholder="Ex: Compras Supermercado" {...field} />
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
                        <FormLabel>Valor Total (R$)</FormLabel>
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
                    <FormItem className="flex flex-col">
                    <FormLabel>Data da Compra</FormLabel>
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
                    name="card_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Cartão</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {cards.map((card) => (
                                    <SelectItem key={card.id} value={card.id}>
                                        {card.name}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Only show Installments field when creating (not editing) */}
                {!initialData && (
                    <FormField
                        control={form.control}
                        name="installments"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Parcelas (1x = à vista)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    min="1" 
                                    max="99" 
                                    placeholder="1" 
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {isEditingInstallment && (
                    <FormField
                        control={form.control}
                        name="update_scope"
                        render={({ field }) => (
                            <FormItem className={!initialData ? "" : "col-span-2"}>
                            <FormLabel>Aplicar alterações?</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="SINGLE">Apenas nesta parcela</SelectItem>
                                    <SelectItem value="ALL_FUTURE">Nesta e nas próximas</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                 Cancelar
               </Button>
               <Button type="submit" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {initialData ? "Salvar Alterações" : "Salvar Despesa"}
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
