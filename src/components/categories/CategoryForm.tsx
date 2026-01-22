"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

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
import { Category, CategoryInput } from "@/types/categories"
import { createCategory, updateCategory } from "@/services/categories"
import { useToast } from "@/components/ui/use-toast"
import { IconPicker } from "@/components/ui/icon-picker"
import { cn } from "@/lib/utils"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e",
  "#6b7280", "#000000", "#4ade80", "#60a5fa", "#fbbf24", "#f472b6"
]

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent: z.string().optional().nullable(),
})

interface CategoryFormProps {
  category?: Category
  parentCategory?: Category // New prop for creating subcategory
  currentSubcategoryCount?: number
  onSuccess: () => void
  onCancel?: () => void
}

export function CategoryForm({ category, parentCategory, currentSubcategoryCount = 0, onSuccess, onCancel }: CategoryFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category?.name || "",
      type: (category?.type as "INCOME" | "EXPENSE") || (parentCategory?.type as "INCOME" | "EXPENSE") || "EXPENSE",
      icon: category?.icon || parentCategory?.icon || "",
      color: category?.color || parentCategory?.color || "",
      parent: category?.parent || parentCategory?.id || null,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Submetendo formulário com valores:", values)
    setIsLoading(true)
    try {
      let payload: CategoryInput = {
        ...values,
        is_active: true,
      }

      // Force inheritance from parent category if creating a subcategory
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
        toast({ title: "Categoria atualizada com sucesso!" })
      } else {
        await createCategory(payload)
        toast({ title: "Categoria criada com sucesso!" })
      }
      onSuccess()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Erro ao salvar categoria:", error)
      
      let errorMessage = "Tente novamente mais tarde."
      
      if (error.response?.status === 400) {
          const data = error.response.data
          // Prioridade: Detail > Non-Field Errors > Primeira mensagem
          errorMessage = data.detail || 
                         (data.non_field_errors && data.non_field_errors[0]) ||
                         (Array.isArray(data) ? data[0] : null) ||
                         (typeof data === 'object' ? Object.values(data)[0] : null) || 
                         "Erro de validação."
          
          if (Array.isArray(errorMessage)) errorMessage = errorMessage[0] // Caso valores sejam arrays
      }

      toast({ 
        title: "Erro ao salvar categoria", 
        description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const { formState: { errors } } = form
  
  // Log form errors whenever they change
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.warn("Erros de validação no formulário:", errors)
    }
  }, [errors])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: Alimentação" {...field} />
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
                        <SelectItem value="INCOME">Receita</SelectItem>
                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
        </div>

        {!parentCategory && (
          <>
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
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                      <div className="flex flex-wrap gap-3">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer shadow-sm",
                              field.value === color ? "border-primary scale-125 ring-2 ring-primary/20" : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground mr-2">Personalizado:</span>
                        <div className="relative group">
                            <Input 
                                type="color" 
                                className="w-8 h-8 p-0 border-0 rounded-full cursor-pointer overflow-hidden transition-transform hover:scale-110" 
                                value={field.value || "#000000"} 
                                onChange={field.onChange} 
                            />
                            <div className="absolute inset-0 rounded-full ring-1 ring-border pointer-events-none" />
                        </div>
                        <Input 
                            {...field} 
                            placeholder="#000000" 
                            className="flex-1 h-8 font-mono text-sm uppercase bg-background/50" 
                            maxLength={7}
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || (!!parentCategory && currentSubcategoryCount >= 5)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? "Salvar Alterações" : "Criar Categoria"}
          </Button>
        </div>
        
        {!!parentCategory && currentSubcategoryCount >= 5 && (
            <p className="text-sm text-destructive mt-2 text-right">
                O limite de 5 subcategorias foi atingido para este item.
            </p>
        )}
      </form>
    </Form>
  )
}
