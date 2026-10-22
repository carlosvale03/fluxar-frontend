"use client"

import { useState, type ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Info, ChevronRight } from "lucide-react"
import { LucideIcon } from "@/components/ui/icon-picker"
import { usePlan } from "@/hooks/use-plan"
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"

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
import { Category, CategoryInput, ExpenseClass } from "@/types/categories"
import { COR_SEM_CLASSE, ROTULO_SEM_CLASSE } from "@/lib/classes"
import { createCategory, updateCategory } from "@/services/categories"
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
import { IconPicker } from "@/components/ui/icon-picker"
import { cn } from "@/lib/utils"

// Cores pré-definidas: são dados do usuário (P-08), não tokens do tema
const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#84cc16", // Lime
  "#64748b", // Slate
  "#475569", // Cool Gray
  "#2dd4bf", // Aquamarine
  "#fb7185", // Soft Rose
  "#c084fc", // Soft Purple
]

const formSchema = z.object({
  name: z.string().min(2, "Use pelo menos 2 caracteres no nome."),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent: z.string().optional().nullable(),
  expense_class: z.string().optional(),
})

// Opção sem classe própria: na subcategoria, herda a da mãe (CLASSE-16, CLASSE-20)
const SEM_CLASSE_PROPRIA = "__sem_classe_propria__"

interface CategoryFormProps {
  category?: Category
  parentCategory?: Category
  // Categoria-mãe de uma subcategoria em edição, para mostrar a classe herdada
  categoriaMae?: Category
  // Classes do usuário para a seleção (CLASSE-17)
  classes?: ExpenseClass[]
  currentSubcategoryCount?: number
  defaultType?: "INCOME" | "EXPENSE"
  onSuccess: () => void
  onCancel?: () => void
}

function TituloDaSecao({ children }: { children: ReactNode }) {
  return <h3 className="label text-muted-foreground">{children}</h3>
}

export function CategoryForm({ category, parentCategory, categoriaMae, classes = [], currentSubcategoryCount = 0, defaultType, onSuccess, onCancel }: CategoryFormProps) {
  // PERM-18 e PERM-20: o limite de subcategorias vem do /auth/me; o uso é o da categoria-pai
  const { limite, limiteAtingido, atualizarUso } = usePlan()
  const limiteDeSubcategorias = limite("limite_subcategorias")?.limit ?? null
  const subcategoriasNoLimite = !!parentCategory && limiteAtingido("limite_subcategorias", currentSubcategoryCount)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category?.name || "",
      type: (category?.type as "INCOME" | "EXPENSE") || (parentCategory?.type as "INCOME" | "EXPENSE") || defaultType || "EXPENSE",
      icon: category?.icon || parentCategory?.icon || "",
      color: category?.color || parentCategory?.color || "",
      parent: category?.parent || parentCategory?.id || null,
      expense_class: category?.expense_class || SEM_CLASSE_PROPRIA,
    },
  })

  // CLASSE-21: categoria de receita não tem classe, e a seleção some
  const tipo = useWatch({ control: form.control, name: "type" })
  const ehSubcategoria = !!parentCategory || !!category?.parent
  const mae = parentCategory ?? categoriaMae
  // CLASSE-20: a classe que a subcategoria herda (a efetiva da mãe)
  const classeDaMae = mae
    ? mae.effective_class ?? null
    : category?.class_inherited
      ? category.effective_class ?? null
      : null
  const rotuloSemClassePropria = ehSubcategoria
    ? `Herdar da categoria-mãe (${classeDaMae?.name ?? ROTULO_SEM_CLASSE})`
    : ROTULO_SEM_CLASSE

  async function onSubmit({ expense_class, ...values }: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      let payload: CategoryInput = {
        ...values,
        is_active: true,
      }

      // CLASSE-17: uma classe do usuário ou nenhuma (null)
      if (values.type === "EXPENSE") {
        payload.expense_class = !expense_class || expense_class === SEM_CLASSE_PROPRIA ? null : expense_class
      }

      if (parentCategory) {
        payload = {
            ...payload,
            parent: parentCategory.id,
            type: parentCategory.type,
            icon: parentCategory.icon,
            color: parentCategory.color
        }
      }

      if (category) {
        await updateCategory(category.id, payload)
        toast.success("Categoria atualizada.")
      } else {
        await createCategory(payload)
        toast.success("Categoria criada.")
        // PERM-20: a categoria nova conta no limite do /auth/me
        void atualizarUso()
      }
      onSuccess()
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo; o resto, ao Sonner
      tratarErro(error, {
        form,
        campos: ["name", "type", "icon", "color", "parent", "expense_class"],
        mensagemPadrao: "Não foi possível salvar a categoria. Tente de novo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Contexto da subcategoria e limite do plano */}
        {parentCategory && (
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                    <p className="text-sm text-fg-secondary">
                        Subcategorias herdam o ícone e a cor da categoria-mãe.
                    </p>
                </div>

                <div className="flex items-center gap-3 rounded-md border border-border bg-elevated p-3">
                    <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card"
                        style={{ color: parentCategory.color }}
                    >
                        <LucideIcon name={parentCategory.icon || "Tag"} className="h-4 w-4" />
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{parentCategory.name}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="text-sm text-fg-secondary">Nova subcategoria</span>
                    </div>
                    <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                        {currentSubcategoryCount}{limiteDeSubcategorias !== null && ` / ${limiteDeSubcategorias}`}
                    </span>
                </div>

                <AvisoDeLimite chave="limite_subcategorias" rotulo="subcategorias" usado={currentSubcategoryCount} />
            </div>
        )}

        {/* Seção 1: Dados gerais */}
        <section className="space-y-4">
            <TituloDaSecao>Dados gerais</TituloDaSecao>

            <div className={cn("grid grid-cols-1 gap-4", !parentCategory && "md:grid-cols-2")}>
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nome da categoria</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex.: Alimentação" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                {!parentCategory && (
                    <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="INCOME">Entrada</SelectItem>
                                <SelectItem value="EXPENSE">Saída</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
            </div>

            {/* CLASSE-17 e CLASSE-20: classe da saída; a subcategoria começa herdando a da mãe */}
            {tipo === "EXPENSE" && (
                <FormField
                control={form.control}
                name="expense_class"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Classe da saída</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione a classe" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value={SEM_CLASSE_PROPRIA}>
                                <div className="flex items-center gap-2">
                                    <span
                                        aria-hidden="true"
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: classeDaMae && ehSubcategoria ? classeDaMae.color : COR_SEM_CLASSE }}
                                    />
                                    {rotuloSemClassePropria}
                                </div>
                            </SelectItem>
                            {classes.map((classe) => (
                                <SelectItem key={classe.id} value={classe.id}>
                                    <div className="flex items-center gap-2">
                                        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: classe.color }} />
                                        {classe.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
        </section>

        {/* Seção 2: Identidade visual */}
        {!parentCategory && (
          <section className="space-y-4">
            <TituloDaSecao>Identidade visual</TituloDaSecao>

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícone</FormLabel>
                  <FormControl>
                    <IconPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div role="group" aria-label="Cor da categoria" className="space-y-4 rounded-lg border border-border bg-card p-4">
                      <div className="grid grid-cols-8 gap-2">
                        {PRESET_COLORS.map((color) => {
                          const isSelected = field.value === color
                          return (
                            <button
                              key={color}
                              type="button"
                              aria-label={`Cor ${color}`}
                              aria-pressed={isSelected}
                              className={cn(
                                "h-8 w-8 cursor-pointer rounded-md transition-[opacity,box-shadow] duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isSelected
                                  ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                                  : "opacity-80 hover:opacity-100"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => field.onChange(color)}
                            />
                          )
                        })}
                      </div>

                      <div className="flex items-center gap-3 border-t border-border pt-4">
                        <Input
                          type="color"
                          aria-label="Escolher outra cor"
                          className="h-9 w-12 shrink-0 cursor-pointer p-1"
                          value={field.value || "#000000"}
                          onChange={field.onChange}
                        />
                        <Input
                          {...field}
                          aria-label="Cor em hexadecimal"
                          placeholder="#HEXADECIMAL"
                          className="flex-1 font-mono uppercase"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
        )}

        {/* Ações: secundária à esquerda, primária à direita */}
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading} disabled={subcategoriasNoLimite}>
            {category ? "Salvar alterações" : "Criar categoria"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
