"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Hash } from "lucide-react"

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
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
import { usePlan } from "@/hooks/use-plan"
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
  name: z.string().min(1, "Informe o nome do marcador."),
  color: z.string().optional(),
})

interface TagFormProps {
  tag?: TagType
  onSuccess: () => void
  onCancel: () => void
}

export function TagForm({ tag, onSuccess, onCancel }: TagFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  // PERM-20: criar ou excluir muda o uso dos limites do /auth/me
  const { atualizarUso } = usePlan()

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
        toast.success("Marcador atualizado.")
      } else {
        await createTag(values as TagInput)
        toast.success("Marcador criado.")
        void atualizarUso()
      }
      onSuccess()
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo; o resto, ao Sonner
      tratarErro(error, {
        form,
        campos: ["name", "color"],
        mensagemPadrao: "Não foi possível salvar o marcador. Tente de novo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Prévia: o marcador como aparece nos lançamentos */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-card p-6">
            <p className="label text-muted-foreground">Prévia</p>
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border-strong px-3 py-1">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: watchColor }} />
                <span className="truncate text-sm font-semibold text-foreground">{form.watch("name") || "Nome do marcador"}</span>
            </span>
        </div>

        {/* Seção 1: Dados gerais */}
        <section className="space-y-4">
            <h3 className="label text-muted-foreground">Dados gerais</h3>

            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome do marcador</FormLabel>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <FormControl>
                                <Input
                                    placeholder="Ex.: Viagem, Freelance"
                                    {...field}
                                    className="pl-9"
                                />
                            </FormControl>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </section>

        {/* Seção 2: Identidade visual */}
        <section className="space-y-4">
            <h3 className="label text-muted-foreground">Identidade visual</h3>

            <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <FormControl>
                            <div role="group" aria-label="Cor do marcador" className="space-y-4 rounded-lg border border-border bg-card p-4">
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

        {/* Ações: secundária à esquerda, primária à direita */}
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {tag ? "Salvar alterações" : "Criar marcador"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
