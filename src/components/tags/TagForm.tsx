"use client"

import { useState } from "react"
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
import { Tag, TagInput } from "@/types/categories"
import { createTag, updateTag } from "@/services/tags"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().optional(),
})

interface TagFormProps {
  tag?: Tag
  onSuccess: () => void
  onCancel: () => void
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e",
  "#6b7280", "#000000", "#4ade80", "#60a5fa", "#fbbf24", "#f472b6"
]

export function TagForm({ tag, onSuccess, onCancel }: TagFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tag?.name || "",
      color: tag?.color || "#000000",
    },
  })

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Importante, Urgente, Viagem..." {...field} />
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

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tag ? "Salvar Alterações" : "Criar Tag"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
