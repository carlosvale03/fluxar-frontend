"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { 
  Loader2, 
  Plus, 
  CreditCard as CreditCardIcon, 
  Banknote, 
  Calendar as CalendarIcon, 
  Palette, 
  Info,
  Check
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { api } from "@/services/apiClient"
import { CreditCard } from "@/types/cards"
import { BANKS } from "@/data/banks"
import { Account } from "@/types/accounts"

// ...

const cardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  limit: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Limite deve ser maior que zero",
  }),
  closing_day: z.string().refine((val) => {
      const num = Number(val)
      return !isNaN(num) && num >= 1 && num <= 31
  }, { message: "Dia deve ser entre 1 e 31" }),
  due_day: z.string().refine((val) => {
      const num = Number(val)
      return !isNaN(num) && num >= 1 && num <= 31
  }, { message: "Dia deve ser entre 1 e 31" }),
  institution: z.string().optional(),
  color: z.string().optional(),
  account_id: z.string().min(1, "Selecione uma conta vinculada"),
})

type CardFormValues = z.infer<typeof cardSchema>

interface CreditCardFormDialogProps {
  card?: CreditCard
  trigger?: React.ReactNode
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreditCardFormDialog({ 
    card, 
    trigger, 
    onSuccess, 
    open: controlledOpen, 
    onOpenChange: setControlledOpen 
}: CreditCardFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? setControlledOpen : setInternalOpen

  const isEditing = !!card

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      limit: "0",
      closing_day: "1",
      due_day: "10",
      institution: "",
      color: "#6366f1",
      account_id: "",
    },
  })

  // Watch values for real-time preview
  const watchedName = watch("name")
  const watchedInstitution = watch("institution")
  const watchedColor = watch("color")
  const watchedLimit = watch("limit")

  // Fetch accounts when dialog opens
  useEffect(() => {
    if (open) {
        api.get("/accounts/").then(res => {
            const data = Array.isArray(res.data) ? res.data : res.data.results
            setAccounts(data || [])
        }).catch(err => {
            console.error("Failed to fetch accounts", err)
            toast.error("Erro ao carregar contas vinculadas.")
        })
    }
  }, [open])

  useEffect(() => {
    if (card) {
      reset({
        name: card.name,
        limit: card.limit.toString(),
        closing_day: card.closing_day.toString(),
        due_day: card.due_day.toString(),
        institution: card.institution || "",
        color: card.color || "#6366f1",
        account_id: card.account_id || "",
      })
    } else {
        reset({
            name: "",
            limit: "0",
            closing_day: "1",
            due_day: "10",
            institution: "",
            color: "#6366f1", // Default color for new card
            account_id: "",
        })
    }
  }, [card, reset, open])

  const onSubmit = async (data: CardFormValues) => {
    setIsLoading(true)
    try {
      const payload = {
          name: data.name,
          limit: Number(data.limit),
          closing_day: Number(data.closing_day),
          due_day: Number(data.due_day),
          institution: data.institution,
          color: data.color,
          account_id: data.account_id
      }

      if (isEditing && card) {
        await api.put(`/credit-cards/${card.id}/`, payload)
        toast.success("Cartão atualizado!")
      } else {
        await api.post("/credit-cards/", payload)
        toast.success("Cartão criado!")
      }
      
      if (setOpen) setOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error(error)
      const msg = error.response?.data?.detail || "Erro ao salvar cartão."
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedBank = BANKS.find(b => b.value === watchedInstitution)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
            {/* Header com Preview */}
            <div className="relative p-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border-b border-border/40">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                        {isEditing ? "Editar Cartão" : "Novo Cartão"}
                    </DialogTitle>
                    <DialogDescription className="font-medium">
                        {isEditing ? "Altere os dados do seu cartão de crédito." : "Cadastre um novo cartão de crédito vinculado a uma conta."}
                    </DialogDescription>
                </DialogHeader>

                {/* Card Preview Visualization */}
                <div className="relative mx-auto w-full max-w-[340px] aspect-[1.586] rounded-2xl p-6 overflow-hidden shadow-2xl transition-all duration-500 group"
                    style={{ 
                        background: `linear-gradient(135deg, ${watchedColor || '#6366f1'} 0%, ${watchedColor ? watchedColor + 'CC' : '#4f46e5'} 100%)`,
                    }}
                >
                    {/* Glass Overlay */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Chip & Logo */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-10 h-7 bg-gradient-to-br from-amber-200 to-amber-500 rounded-md shadow-inner flex flex-col gap-1 p-1">
                            <div className="h-full border-r border-amber-600/20" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black tracking-[0.2em] text-white/50 uppercase italic">
                                {selectedBank?.label || "Fluxar Pay"}
                            </p>
                            <CreditCardIcon className="h-6 w-6 text-white/80 mt-1 ml-auto" />
                        </div>
                    </div>

                    {/* Card Details */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Nome no Cartão</p>
                            <p className="text-sm font-black text-white tracking-widest uppercase truncate max-w-full min-h-[1.25rem]">
                                {watchedName || "NOME DO CLIENTE"}
                            </p>
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Limite Total</p>
                                <p className="text-lg font-black text-white leading-none">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(watchedLimit) || 0)}
                                </p>
                            </div>
                            <div className="flex -space-x-3 opacity-80">
                                <div className="h-8 w-8 rounded-full bg-white/20 border border-white/10" />
                                <div className="h-8 w-8 rounded-full bg-white/10 border border-white/5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Fields - Scrollable area */}
            <div className="p-8 space-y-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
                
                {/* Seção 1: Identidade */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                            <Info className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Identidade do Cartão</span>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Apelido do Cartão</Label>
                            <Input 
                                id="name" 
                                placeholder="Ex: Nubank Principal" 
                                {...register("name")} 
                                className={`rounded-xl border-border/60 ${errors.name ? "ring-2 ring-red-500/20 border-red-500" : ""}`}
                            />
                            {errors.name && <span className="text-[10px] font-bold text-red-500 uppercase">{errors.name.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label>Conta de Pagamento (Fatura)</Label>
                            <Select 
                                onValueChange={(val) => setValue("account_id", val, { shouldValidate: true })}
                                value={watch("account_id")}
                            >
                                <SelectTrigger className={`rounded-xl border-border/60 ${errors.account_id ? "ring-2 ring-red-500/20 border-red-500" : ""}`}>
                                    <SelectValue placeholder="Selecione a conta para débito" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/40">
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id} className="rounded-lg">
                                            {acc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.account_id && <span className="text-[10px] font-bold text-red-500 uppercase">{errors.account_id.message}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Instituição</Label>
                                <Select 
                                    onValueChange={(val) => {
                                        setValue("institution", val)
                                        const bankColor = BANKS.find(b => b.value === val)?.color
                                        if (bankColor) setValue("color", bankColor)
                                    }} 
                                    value={watch("institution")}
                                >
                                    <SelectTrigger className="rounded-xl border-border/60">
                                        <SelectValue placeholder="Opcional" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/40">
                                        {BANKS.map((bank) => (
                                            <SelectItem key={bank.value} value={bank.value} className="rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 w-3 rounded-full" style={{ background: bank.color }} />
                                                    {bank.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Cor do Cartão</Label>
                                <div className="flex gap-2">
                                    <div className="relative w-full h-10 rounded-xl border border-border/60 overflow-hidden flex items-center px-3 group bg-card">
                                        <input 
                                            type="color" 
                                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                            value={watch("color") || "#6366f1"}
                                            onChange={(e) => setValue("color", e.target.value)}
                                        />
                                        <div className="h-4 w-4 rounded-full mr-2 shadow-sm" style={{ background: watchedColor }} />
                                        <span className="text-xs font-mono font-bold uppercase">{watchedColor}</span>
                                        <Palette className="h-3 w-3 ml-auto text-muted-foreground opacity-40" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="bg-border/40" />

                {/* Seção 2: Ciclo e Limites */}
                <div className="space-y-5 px-1 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                            <Banknote className="h-3 w-3 text-emerald-500" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Ciclo e Limites</span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="limit">Limite Total de Crédito</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                            <Input 
                                id="limit" 
                                type="number" 
                                step="0.01" 
                                {...register("limit")} 
                                className="pl-10 rounded-xl border-border/60 font-bold"
                            />
                        </div>
                        {errors.limit && <span className="text-[10px] font-bold text-red-500 uppercase">{errors.limit.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="closing_day" className="flex items-center gap-1.5">
                                Fechamento <Info className="h-3 w-3 text-muted-foreground/40" />
                            </Label>
                            <Input 
                                id="closing_day" 
                                type="number" 
                                min="1" 
                                max="31"
                                {...register("closing_day")} 
                                className="rounded-xl border-border/60 text-center font-black"
                            />
                            {errors.closing_day && <span className="text-[10px] font-bold text-red-500 uppercase">{errors.closing_day.message}</span>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_day" className="flex items-center gap-1.5">
                                Vencimento <CalendarIcon className="h-3 w-3 text-muted-foreground/40" />
                            </Label>
                            <Input 
                                id="due_day" 
                                type="number" 
                                min="1" 
                                max="31"
                                {...register("due_day")} 
                                className="rounded-xl border-border/60 text-center font-black"
                            />
                            {errors.due_day && <span className="text-[10px] font-bold text-red-500 uppercase">{errors.due_day.message}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer com Botão */}
            <div className="p-6 bg-muted/30 border-t border-border/40 flex justify-end">
                <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="w-full sm:w-auto min-w-[180px] h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Check className="mr-2 h-4 w-4" />
                    )}
                    {isEditing ? "Gravar Alterações" : "Ativar Cartão"}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
