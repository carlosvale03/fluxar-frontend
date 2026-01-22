"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Target, TrendingUp, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { Budget } from "@/types/budgets"
import { Category } from "@/types/categories"
import { getCategories } from "@/services/categories"
import { createBudget, updateBudget } from "@/services/budgets"
import { useToast } from "@/components/ui/use-toast"
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { LucideIcon } from "@/components/ui/icon-picker"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  category: z.string().min(1, "Categoria é obrigatória"),
  month: z.number().min(1).max(12),
  year: z.number().min(2023).max(2030),
  amount_limit: z.coerce.number().min(0.01, "O limite deve ser maior que zero"),
})

interface BudgetFormProps {
  budget?: Budget
  onSuccess: () => void
  onCancel: () => void
  defaultMonth?: number
  defaultYear?: number
}

type FormValues = z.infer<typeof formSchema>

export function BudgetForm({ budget, onSuccess, onCancel, defaultMonth, defaultYear }: BudgetFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const { toast } = useToast()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      category: budget?.category || "",
      month: budget?.month || defaultMonth || currentMonth,
      year: budget?.year || defaultYear || currentYear,
      amount_limit: budget?.amount_limit ? Number(budget.amount_limit) : 0,
    },
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories()
        const expenseCats = data.filter(cat => cat.type === "EXPENSE")
        
        // Flatten categories for Select
        const organized: Category[] = []
        expenseCats.forEach(parent => {
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
      } catch (error) {
        console.error("Failed to fetch categories", error)
        toast({
            title: "Erro ao carregar categorias",
            variant: "destructive"
        })
      }
    }
    fetchCategories()
  }, [toast])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      if (budget) {
        await updateBudget(budget.id, values)
        toast({ title: "Orçamento atualizado!" })
      } else {
        await createBudget(values)
        toast({ title: "Orçamento definido!" })
      }
      onSuccess()
    } catch (error) {
      console.error(error)
      toast({ 
        title: "Erro ao salvar orçamento", 
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ]

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

  return (
    <div className="flex flex-col">
      <DialogHeader className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-500/10 animate-in zoom-in-50 duration-500">
            {budget ? <TrendingUp className="h-6 w-6" /> : <Target className="h-6 w-6" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {budget ? "Editar Orçamento" : "Novo Orçamento"}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium opacity-70">
              {budget ? "Ajuste as metas de gastos desta categoria." : "Defina limites para controlar seus gastos mensais."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Categoria Alvo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!budget}>
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
                {!!budget && (
                  <div className="flex items-center gap-1.5 mt-2 ml-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    <span>A categoria não pode ser alterada após a criação.</span>
                  </div>
                )}
                <FormMessage className="ml-1 text-[11px]" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
              <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Mês</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                      <FormControl>
                      <SelectTrigger className="h-12 px-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                          <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl shadow-xl">
                      {months.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)} className="rounded-xl">
                          {m.label}
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
              name="year"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Ano</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                      <FormControl>
                      <SelectTrigger className="h-12 px-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                          <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl shadow-xl">
                      {years.map((y) => (
                          <SelectItem key={y} value={String(y)} className="rounded-xl">
                          {y}
                          </SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
                  <FormMessage className="ml-1 text-[11px]" />
                  </FormItem>
              )}
              />
          </div>

          <FormField
            control={form.control}
            name="amount_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Limite do Orçamento</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0,00" 
                      {...field}
                      onFocus={(e) => e.target.select()}
                      className="h-12 pl-10 pr-4 rounded-2xl border-muted/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all text-base font-bold text-rose-500"
                    />
                  </div>
                </FormControl>
                <FormMessage className="ml-1 text-[11px]" />
              </FormItem>
            )}
          />

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={onCancel}
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
              {budget ? "Salvar Alterações" : "Definir Orçamento"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  )
}
