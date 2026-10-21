"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, CreditCard, AlertCircle, PlusCircle, CornerDownRight } from "lucide-react"
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
import { lerData } from "@/lib/datas"
import { Category } from "@/types/categories"
import { CreditCard as CreditCardType } from "@/types/cards"

import { PrincipalDoVinculo, Transaction } from "@/types/transactions"
import { textoDaPrincipal } from "@/services/vinculos"

import { TagSelector } from "@/components/tags/TagSelector"
import { usePlan } from "@/hooks/use-plan"
import { AvisoCompacto } from "@/components/planos/recurso-bloqueado"
import { LucideIcon } from "@/components/ui/icon-picker"
import { MoneyInput } from "@/components/ui/money-input"
import { maiorQueZero } from "@/lib/dinheiro"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { tratarErro } from "@/lib/erros"

const formSchema = z.object({
  description: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),
  // CONTRATO-17: o valor vai à API como texto decimal ("1234.56")
  amount: z.string().refine(maiorQueZero, "O valor deve ser maior que 0."),
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
  // VINCULO-01: a compra relacionada nasce já como dependente desta principal
  principal?: PrincipalDoVinculo | null
}

export function CardExpenseFormDialog({ open, onOpenChange, onSuccess, initialData, principal }: CardExpenseFormDialogProps) {
  // A principal só vale na criação
  const principalDoNovo = !initialData ? principal ?? null : null
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CreditCardType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  // PERM-19: compra nova no cartão depende de `cartoes`; parcelar acima de 1x,
  // de `compras_parceladas`; o campo de tags, de `tags`
  const { podeUsar } = usePlan()
  const compraBloqueada = !initialData && podeUsar("cartoes") === false
  const parceladasLiberadas = podeUsar("compras_parceladas") === true
  const tagsLiberadas = podeUsar("tags") === true

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      description: "",
      amount: "",
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
            form.reset({
                description: initialData.description,
                amount: initialData.amount,
                // FATURA-16: a data da compra; compras antigas só têm a data gravada
                date: lerData(initialData.purchase_date || initialData.date),
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
                amount: "",
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
          
          let rawCats: Category[] = catRes.data
          
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
          setCards(cardRes.data)
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
          // FATURA-17: na edição, a data da compra muda só por purchase_date
          Object.assign(finalPayload, { purchase_date: payload.date })

          await api.put(`/transactions/${initialData.id}/`, finalPayload)
          toast.success("Despesa atualizada.")
      } else {
          // Create - Installments matters here
          // Re-add installments for Create
           (finalPayload as any).installments = parceladasLiberadas ? data.installments : 1
           if (principalDoNovo) Object.assign(finalPayload, { principal: principalDoNovo.id })

          await api.post("/transactions/credit-card-expense/", finalPayload)
          toast.success("Despesa registrada.")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo. FATURA-19: a
      // recusa da compra em fatura paga vem no detail, que vai ao Sonner
      tratarErro(error, {
        form,
        campos: {
          description: "description",
          amount: "amount",
          date: "date",
          purchase_date: "date",
          credit_card: "card_id",
          category: "category_id",
          installments: "installments",
          tags: "tags",
          update_scope: "update_scope",
        },
        mensagemPadrao: "Erro ao salvar despesa. Verifique os dados.",
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
              <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-outflow">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle>
                  {initialData ? "Editar Despesa" : "Novo Gasto no Cartão"}
                </DialogTitle>
                <DialogDescription>
                  {initialData ? "Atualize os detalhes da transação no cartão." : "Registre uma compra feita no crédito."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* VINCULO-01 */}
          {principalDoNovo && !compraBloqueada && (
            <div role="note" className="mb-6 rounded-sm border border-l-[3px] border-border border-l-info bg-card px-4 py-2 text-sm text-fg-secondary">
              {textoDaPrincipal(principalDoNovo)}
            </div>
          )}

          {compraBloqueada ? (
            <AvisoCompacto />
          ) : (
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
                      <FormLabel>Descrição do Gasto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Assinatura Netflix, Jantar..." 
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

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Valor Total</FormLabel>
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
                        <FormLabel>Data da Compra</FormLabel>
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

                <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="card_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cartão Utilizado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {cards.map((card) => (
                                        <SelectItem key={card.id} value={card.id}>
                                            <div className="flex items-center gap-2">
                                                {/* Cor do cartão: dado do usuário */}
                                                <span
                                                    aria-hidden="true"
                                                    className={cn("h-2.5 w-2.5 rounded-full", !card.color && "bg-muted-foreground")}
                                                    style={card.color ? { backgroundColor: card.color } : undefined}
                                                />
                                                <span>{card.name}</span>
                                            </div>
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
                                <SelectContent className="max-h-[450px] p-2">
                                    <div className="flex flex-col">
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            className="mb-1 w-full justify-start gap-2"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setIsCategoryDialogOpen(true)
                                            }}
                                        >
                                            <PlusCircle aria-hidden="true" />
                                            Nova Categoria
                                        </Button>

                                        <div className="px-2 mb-2">
                                            <Separator />
                                        </div>

                                        {categories.map((cat: any, index: number) => {
                                            const isMaster = !cat.isSubcategory;
                                            const isFirstMaster = isMaster && !categories.slice(0, index).some((c: any) => !c.isSubcategory);
                                            const showSeparator = isMaster && !isFirstMaster;
                                                
                                                return (
                                                    <div key={cat.id}>
                                                        {showSeparator && (
                                                            <div className="px-2 my-2">
                                                                <Separator />
                                                            </div>
                                                        )}
                                                        <SelectItem 
                                                            key={cat.id} 
                                                            value={cat.id} 
                                                            className={cn(
                                                                "group",
                                                                cat.isSubcategory ? "py-1.5" : "py-2"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "flex items-center gap-3",
                                                                cat.isSubcategory && "pl-8"
                                                            )}>
                                                                {cat.isSubcategory && (
                                                                    <div className="flex items-center shrink-0">
                                                                        <CornerDownRight className="mr-2 h-3 w-3 text-muted-foreground" aria-hidden="true" />
                                                                    </div>
                                                                )}
                                                                
                                                                <div 
                                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                                                    style={{ 
                                                                        backgroundColor: `${cat.color}15`, 
                                                                        color: cat.color 
                                                                    }}
                                                                >
                                                                    <LucideIcon name={cat.icon || "Tag"} className="h-4 w-4" />
                                                                </div>

                                                                <div className="flex flex-col">
                                                                    <span className={cn(
                                                                        "transition-colors duration-fast",
                                                                        cat.isSubcategory 
                                                                            ? "text-sm text-fg-secondary group-data-[highlighted]:text-foreground" 
                                                                            : "text-sm font-medium"
                                                                    )}>
                                                                        {cat.name}
                                                                    </span>
                                                                    {!cat.isSubcategory && (
                                                                        <span className="text-xs text-muted-foreground">Categoria Master</span>
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
                            <FormMessage />
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
                                <FormLabel>Parcelas</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="99"
                                        placeholder="1"
                                        {...field}
                                        value={parceladasLiberadas ? field.value : 1}
                                        disabled={!parceladasLiberadas}
              
                                    />
                                </FormControl>
                                {!parceladasLiberadas && <AvisoCompacto className="mt-2" />}
                                <FormMessage />
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
                        <div className="space-y-3 rounded-sm border border-l-[3px] border-border border-l-warn bg-card p-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                               <AlertCircle className="h-4 w-4 text-warn" aria-hidden="true" />
                               Edição de Parcelas
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <Label htmlFor="escopo-das-parcelas">Aplicar alterações para:</Label>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger id="escopo-das-parcelas" className="w-[200px]">
                                          <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="SINGLE">Apenas nesta parcela</SelectItem>
                                        <SelectItem value="ALL_FUTURE">Nesta e nas próximas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                      )}
                    />
                )}
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
                  {initialData ? "Salvar Alterações" : "Adicionar Despesa"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          )}
        </div>
      </DialogContent>

      {/* Modal Secundário: Nova Categoria */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6">
                <DialogHeader className="mb-6">
                    <DialogTitle>Nova Categoria</DialogTitle>
                    <DialogDescription>Crie uma categoria sem sair do lançamento.</DialogDescription>
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
