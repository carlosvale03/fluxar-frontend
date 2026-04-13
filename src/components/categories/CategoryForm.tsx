"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, PlusCircle, Pencil, Trash2, Search, Wallet, Sparkles, Tag, Info, AlertCircle, ChevronRight } from "lucide-react"
import { LucideIcon } from "@/components/ui/icon-picker"

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
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent: z.string().optional().nullable(),
})

interface CategoryFormProps {
  category?: Category
  parentCategory?: Category 
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
    setIsLoading(true)
    try {
      let payload: CategoryInput = {
        ...values,
        is_active: true,
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
        toast({ title: "Categoria atualizada com sucesso!" })
      } else {
        await createCategory(payload)
        toast({ title: "Categoria criada com sucesso!" })
      }
      onSuccess()
    } catch (error: any) {
      console.error("Erro ao salvar categoria:", error)
      toast({ 
        title: "Erro ao salvar categoria", 
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500">
        
        {/* Banner de Contexto / Limite (Regra #4) */}
        {parentCategory && (
            <div className="p-5 rounded-[24px] bg-primary/[0.03] border border-primary/10 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm ring-1 ring-primary/20">
                        <Info className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-primary/80">Criando Subcategoria</p>
                        <p className="text-[10px] font-medium text-muted-foreground leading-relaxed mt-0.5">
                            Subcategorias herdam a identidade visual da categoria pai automaticamente.
                        </p>
                    </div>
                </div>

                {/* Parent Preview (Regra #3) */}
                <div className="flex items-center gap-3 p-3 bg-background/50 rounded-2xl border border-border/40">
                    <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: parentCategory.color }}
                    >
                        <LucideIcon name={parentCategory.icon || "Tag"} className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-foreground/80">{parentCategory.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                        <span className="text-xs font-bold text-primary">Nova Item</span>
                    </div>
                    <div className="ml-auto px-2.5 py-1 rounded-full bg-muted/20 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                        {currentSubcategoryCount} / 5
                    </div>
                </div>
                
                {currentSubcategoryCount >= 5 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/5 border border-rose-500/10 rounded-xl text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <p className="text-[10px] font-black uppercase tracking-wider">Limite de subcategorias atingido</p>
                    </div>
                )}
            </div>
        )}

        {/* Seção 1: Dados Gerais */}
        <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Dados Gerais</h3>
            </div>

            <div className={cn(
                "grid grid-cols-1 gap-6 p-5 bg-muted/5 rounded-[24px] border border-border/40",
                !parentCategory && "md:grid-cols-2"
            )}>
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Nome da Categoria</FormLabel>
                    <FormControl>
                        <Input 
                            placeholder="Ex: Alimentação" 
                            className="bg-card border-border/40 h-11 rounded-xl focus-visible:ring-primary/20 font-medium placeholder:text-muted-foreground/30" 
                            {...field} 
                        />
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
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Tipo de Fluxo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger className="bg-card border-border/40 h-11 rounded-xl focus:ring-primary/20">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-border/40 shadow-xl overflow-hidden">
                                <SelectItem value="INCOME" className="focus:bg-emerald-500/10 focus:text-emerald-600 transition-colors">Receita</SelectItem>
                                <SelectItem value="EXPENSE" className="focus:bg-rose-500/10 focus:text-rose-600 transition-colors">Despesa</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
            </div>
        </div>

        {/* Seção 2: Identidade Visual */}
        {!parentCategory && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Identidade Visual</h3>
            </div>

            <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Ícone Representativo</FormLabel>
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
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Paleta de Cores</FormLabel>
                      <FormControl>
                        <div className="space-y-6 p-6 border border-border/40 rounded-[28px] bg-muted/5 backdrop-blur-sm animate-in zoom-in-95 duration-500">
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                            {PRESET_COLORS.map((color) => {
                              const isSelected = field.value === color
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  className={cn(
                                    "w-10 h-10 rounded-xl transition-all duration-300 cursor-pointer relative group flex items-center justify-center",
                                    isSelected ? "scale-110 shadow-lg" : "hover:scale-110 hover:shadow-md opacity-80 hover:opacity-100"
                                  )}
                                  style={{ 
                                    backgroundColor: color,
                                    boxShadow: isSelected ? `0 12px 24px -10px ${color}cc, 0 4px 10px -4px ${color}80` : undefined,
                                    outline: isSelected ? `2px solid ${color}40` : 'none',
                                    outlineOffset: '3px'
                                  }}
                                  onClick={() => field.onChange(color)}
                                >
                                   {isSelected && (
                                       <div className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-inner" />
                                   )}
                                </button>
                              )
                            })}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-5 pt-6 border-t border-border/10">
                            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 ring-4 ring-primary/5" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-[0.2em]">Cor Custom</span>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full flex-1">
                                <div className="relative group shrink-0">
                                    <Input 
                                        type="color" 
                                        className="w-12 h-12 p-0 border-0 rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:scale-110 hover:rotate-3 bg-transparent" 
                                        value={field.value || "#000000"} 
                                        onChange={field.onChange} 
                                    />
                                    <div className="absolute inset-0 rounded-2xl ring-1 ring-border/20 pointer-events-none shadow-inner" />
                                </div>
                                <div className="relative flex-1 group">
                                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        {...field} 
                                        placeholder="#HEXADECIMAL" 
                                        className="h-12 pl-10 font-mono text-sm uppercase bg-card border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-bold tracking-wider" 
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
          </div>
        )}

        {/* Footer: Ações */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border/10 mt-auto">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel} 
            disabled={isLoading} 
            className="rounded-full h-12 px-6 font-bold text-muted-foreground hover:bg-muted/50 transition-all"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || (!!parentCategory && currentSubcategoryCount >= 5)} 
            className="rounded-full h-12 px-10 font-bold shadow-xl shadow-primary/25 transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground"
          >
            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            <Sparkles className="mr-2 h-5 w-5" />
            {category ? "Gravar Alterações" : "Ativar Categoria"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
