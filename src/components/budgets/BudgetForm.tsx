"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { MoneyInput } from "@/components/ui/money-input"
import { maiorQueZero } from "@/lib/dinheiro"
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
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { LucideIcon } from "@/components/ui/icon-picker"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  category: z.string().min(1, "Escolha a categoria da rota."),
  month: z.number().min(1).max(12),
  year: z.number().min(2023).max(2030),
  // CONTRATO-17: o limite vai à API como texto decimal ("1234.56")
  amount_limit: z.string().refine(maiorQueZero, "Informe um limite maior que zero."),
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

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      category: budget?.category || "",
      month: budget?.month || defaultMonth || currentMonth,
      year: budget?.year || defaultYear || currentYear,
      amount_limit: budget?.amount_limit ?? "",
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
        tratarErro(error, { mensagemPadrao: "Não foi possível carregar as categorias. Feche o formulário e abra de novo." })
      }
    }
    fetchCategories()
  }, [])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      if (budget) {
        await updateBudget(budget.id, values)
        toast.success("Rota atualizada.")
      } else {
        await createBudget(values)
        toast.success("Rota traçada.")
      }
      onSuccess()
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo, como o orçamento
      // duplicado no campo da categoria
      tratarErro(error, {
        form,
        campos: ["category", "amount_limit", "month", "year"],
        mensagemPadrao: "Não foi possível salvar a rota. Tente de novo.",
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
      <DialogHeader className="mb-6">
        <DialogTitle>
          {budget ? "Editar rota" : "Nova rota"}
        </DialogTitle>
        <DialogDescription>
          {budget ? "Ajuste o limite de gastos desta categoria." : "Defina um limite de gastos para uma categoria no mês."}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!budget}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                            {/* A cor da categoria é dado do usuário (P-08) */}
                            <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center" style={{ color: cat.color }}>
                                <LucideIcon name={cat.icon} className="h-4 w-4" />
                            </span>
                            <span className={cn(cat.name.startsWith("↳") && "ml-1 text-muted-foreground")}>
                                {cat.name}
                            </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!!budget && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>A categoria não pode ser alterada após a criação.</span>
                  </p>
                )}
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
              <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Mês</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                      <FormControl>
                      <SelectTrigger>
                          <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                      {months.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                          </SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                  </FormItem>
              )}
              />

              <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Ano</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                      <FormControl>
                      <SelectTrigger>
                          <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                      {years.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                          {y}
                          </SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                  </FormItem>
              )}
              />
          </div>

          <FormField
            control={form.control}
            name="amount_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limite da rota</FormLabel>
                <FormControl>
                  <MoneyInput
                    name={field.name}
                    ref={field.ref}
                    value={field.value ?? ""}
                    onValueChange={(valor) => field.onChange(valor ?? "")}
                    onBlur={field.onBlur}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <DialogFooter className="pt-2">
            <Button
                type="button"
                variant="outline"
                onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
                type="submit"
                loading={isLoading}
            >
              {budget ? "Salvar alterações" : "Traçar rota"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  )
}
