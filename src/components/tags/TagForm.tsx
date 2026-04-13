"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Tag, Sparkles, Palette, Hash } from "lucide-react"

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
import { Tag as TagType, TagInput } from "@/types/categories"
import { createTag, updateTag } from "@/services/tags"
import { useToast } from "@/components/ui/use-toast"
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
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().optional(),
})

interface TagFormProps {
  tag?: TagType
  onSuccess: () => void
  onCancel: () => void
}

export function TagForm({ tag, onSuccess, onCancel }: TagFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tag?.name || "",
      color: tag?.color || "#6366f1",
    },
  })

  const watchColor = form.watch("color")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      if (tag) {
        await updateTag(tag.id, values as TagInput)
        toast({ title: "Tag atualizada com sucesso!" })
      } else {
        await createTag(values as TagInput)
        toast({ title: "Tag criada com sucesso!" })
      }
      onSuccess()
    } catch (error: any) {
      console.error(error)
      const errorMessage = error.response?.data?.name?.[0] || "Erro ao salvar tag. Tente novamente."
      toast({ 
        title: "Erro ao salvar tag", 
        description: errorMessage,
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Preview Master */}
        <div className="flex flex-col items-center justify-center p-8 rounded-[32px] bg-muted/5 border border-dashed border-border/60 relative overflow-hidden group">
            <div 
                className="absolute inset-0 opacity-10 blur-3xl transition-colors duration-1000"
                style={{ backgroundColor: watchColor }}
            />
            <div 
                className="w-20 h-20 rounded-[28px] flex items-center justify-center text-white mb-4 relative z-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-2xl"
                style={{ 
                    backgroundColor: watchColor,
                    boxShadow: `0 20px 40px -10px ${watchColor}80`
                }}
            >
                <Tag className="h-10 w-10 animate-in zoom-in-50 duration-500" />
            </div>
            <div className="relative z-10 text-center">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-1">Preview da Tag</p>
                <h4 className="text-lg font-black text-foreground">{form.watch("name") || "Nome da Tag"}</h4>
            </div>
        </div>

        <div className="space-y-6">
            {/* Seção 1: Dados Gerais */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Dados Gerais</h3>
                </div>

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Nome da Tag</FormLabel>
                            <FormControl>
                                <div className="relative group">
                                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        placeholder="Ex: Urgente, Viagem, Freelance..." 
                                        {...field} 
                                        className="h-12 pl-10 bg-card border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-bold tracking-tight"
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Seção 2: Identidade Visual */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Identidade Visual</h3>
                </div>

                <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1 text-center block">Paleta de Cores</FormLabel>
                            <FormControl>
                                <div className="space-y-6 p-6 border border-border/40 rounded-[28px] bg-muted/5 backdrop-blur-sm">
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
                                            <Input 
                                                type="color" 
                                                className="w-12 h-12 p-0 border-0 rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:scale-110 hover:rotate-3 bg-transparent" 
                                                value={field.value || "#000000"} 
                                                onChange={field.onChange} 
                                            />
                                            <Input 
                                                {...field} 
                                                placeholder="#HEXADECIMAL" 
                                                className="flex-1 h-12 font-mono text-sm uppercase bg-card border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-bold tracking-wider" 
                                                maxLength={7}
                                            />
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

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel} 
            disabled={isLoading}
            className="rounded-full h-12 px-8 font-bold text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="rounded-full h-12 px-8 font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {tag ? "Salvar Alterações" : "Criar Tag Premium"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
