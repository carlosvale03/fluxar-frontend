"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, Wallet, Landmark, Building, User, DollarSign, Palette, Sparkles, CheckCircle2 } from "lucide-react"

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/services/apiClient"
import { Account, AccountType, AccountTypeLabels } from "@/types/accounts"
import { BANKS } from "@/data/banks"
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

const accountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.nativeEnum(AccountType),
  initial_balance: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Valor deve ser um número válido",
  }),
  institution: z.string().optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
})

type AccountFormValues = z.infer<typeof accountSchema>

interface AccountFormDialogProps {
  account?: Account
  trigger?: React.ReactNode
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultType?: AccountType
}

export function AccountFormDialog({ 
    account, 
    trigger, 
    onSuccess, 
    open: controlledOpen, 
    onOpenChange: setControlledOpen,
    defaultType = AccountType.CHECKING
}: AccountFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? setControlledOpen : setInternalOpen

  const isEditing = !!account

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: defaultType,
      initial_balance: "0",
      institution: "",
      color: "#6366f1",
      is_active: true,
    },
  })

  const watchColor = watch("color")
  const watchInstitution = watch("institution")

  // Auto-fill color when institution changes
  useEffect(() => {
    if (watchInstitution && watchInstitution !== "other") {
      const bank = BANKS.find(b => b.value === watchInstitution)
      if (bank) {
        setValue("color", bank.color)
      }
    }
  }, [watchInstitution, setValue])

  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        type: account.type,
        initial_balance: account.initial_balance.toString(),
        institution: account.institution || "other",
        color: account.color || "#6366f1",
        is_active: account.is_active,
      })
    } else if (open) {
        reset({
            name: "",
            type: defaultType,
            initial_balance: "0",
            institution: "other",
            color: "#6366f1",
            is_active: true,
        })
    }
  }, [account, reset, open, defaultType])

  const onSubmit = async (data: AccountFormValues) => {
    setIsLoading(true)
    try {
      const payload = {
          ...data,
          initial_balance: Number(data.initial_balance),
          is_active: data.is_active ?? true,
          institution: data.institution === "other" ? "" : data.institution
      }

      if (isEditing && account) {
        await api.put(`/accounts/${account.id}/`, payload)
        toast.success("Conta atualizada com sucesso!")
      } else {
        await api.post("/accounts/", payload)
        toast.success("Conta criada com sucesso!")
      }
      
      setOpen?.(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Erro ao salvar conta:", error.response?.data)
      let msg = "Erro ao salvar conta."
      if (error.response?.data) {
        msg = typeof error.response.data === 'string' ? error.response.data : (error.response.data.detail || Object.values(error.response.data)[0])
      }
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-[520px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
            <div className="p-8">
                <DialogHeader className="mb-8">
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-500 ring-4 ring-black/5 dark:ring-white/5"
                            style={{ 
                                backgroundColor: watchColor,
                                boxShadow: `0 12px 24px -8px ${watchColor}80` 
                            }}
                        >
                            <Wallet className="h-7 w-7 animate-in zoom-in-50 duration-500" />
                        </div>
                        <div>
                            <DialogTitle className="text-3xl font-black tracking-tight">
                                {isEditing ? "Editar Conta" : "Nova Conta"}
                            </DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground/70 mt-1">
                                {isEditing 
                                    ? "Aperfeiçoe os dados da sua conta financeira." 
                                    : "Configure uma nova conexão para seu controle master."}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Seção 1: Identificação */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-primary rounded-full transition-all" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Identificação Geral</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Nome amigável da conta</Label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        id="name" 
                                        placeholder="Ex: Nubank Pessoal, Itaú Empresa..." 
                                        {...register("name")} 
                                        className={cn(
                                            "h-12 pl-10 bg-muted/5 border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-bold tracking-tight",
                                            errors.name && "border-destructive/50 focus-visible:ring-destructive/20"
                                        )}
                                    />
                                </div>
                                {errors.name && <p className="text-[10px] font-bold text-destructive px-1">{errors.name.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Instituição</Label>
                                    <Select 
                                        onValueChange={(val) => setValue("institution", val)} 
                                        value={watchInstitution || "other"}
                                    >
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/5 border-border/40 font-bold focus:ring-primary/20">
                                            <div className="flex items-center gap-3">
                                                {watchInstitution && watchInstitution !== "other" ? (
                                                    <div 
                                                        className="w-3 h-3 rounded-full ring-2 ring-black/5 dark:ring-white/10 shrink-0" 
                                                        style={{ backgroundColor: BANKS.find(b => b.value === watchInstitution)?.color }} 
                                                    />
                                                ) : (
                                                    <Building className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                                )}
                                                <SelectValue placeholder="Banco ou Carteira" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                            <SelectItem value="other" className="rounded-xl font-bold">Outro / Carteira</SelectItem>
                                            <SelectGroup>
                                                <SelectLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Principais Bancos</SelectLabel>
                                                {BANKS.map((bank) => (
                                                    <SelectItem key={bank.value} value={bank.value} className="rounded-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full ring-2 ring-black/5 dark:ring-white/10" style={{ backgroundColor: bank.color }} />
                                                            <span className="font-bold">{bank.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Tipo de conta</Label>
                                    <Select 
                                        onValueChange={(val) => setValue("type", val as AccountType)} 
                                        value={watch("type")}
                                    >
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/5 border-border/40 font-bold focus:ring-primary/20">
                                            <div className="flex items-center gap-2">
                                                <Landmark className="h-4 w-4 text-muted-foreground/40" />
                                                <SelectValue placeholder="Tipo" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                            {Object.entries(AccountTypeLabels).map(([key, label]) => (
                                                <SelectItem key={key} value={key} className="rounded-xl font-bold">{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Financeiro */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-primary rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Financeiro & Saldo</h3>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="initial_balance" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Saldo inicial disponível</Label>
                            <div className="relative group">
                                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                <Input 
                                    id="initial_balance" 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    {...register("initial_balance")} 
                                    className="h-12 pl-10 bg-muted/5 border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-bold tracking-tight"
                                />
                            </div>
                            {errors.initial_balance && <p className="text-[10px] font-bold text-destructive px-1">{errors.initial_balance.message}</p>}
                        </div>
                    </div>

                    {/* Seção 3: Visual */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-primary rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Identidade Visual</h3>
                        </div>

                        <div className="space-y-6 p-6 border border-border/40 rounded-[28px] bg-muted/5 backdrop-blur-sm">
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                                {PRESET_COLORS.map((color) => {
                                    const isSelected = watchColor === color
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
                                            onClick={() => setValue("color", color)}
                                        >
                                            {isSelected && (
                                                <CheckCircle2 className="h-4 w-4 text-white/80 drop-shadow-sm" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-5 pt-6 border-t border-border/10">
                                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                                    <Palette className="h-4 w-4 text-muted-foreground/30" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-[0.2em]">Cor Customizada</span>
                                </div>
                                
                                <div className="flex items-center gap-4 w-full flex-1">
                                    <Input 
                                        type="color" 
                                        className="w-12 h-12 p-0 border-0 rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:scale-110 hover:rotate-3 bg-transparent" 
                                        value={watchColor || "#000000"} 
                                        onChange={(e) => setValue("color", e.target.value)} 
                                    />
                                    <Input 
                                        placeholder="#HEXADECIMAL" 
                                        value={watchColor}
                                        onChange={(e) => setValue("color", e.target.value)}
                                        className="flex-1 h-12 font-mono text-sm uppercase bg-card border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-bold tracking-wider" 
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Toggle Area */}
                    <div className="flex items-center justify-between p-5 rounded-[24px] bg-muted/5 border border-border/20 group hover:border-primary/20 transition-all duration-500">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                watch("is_active") ? "bg-primary/10 text-primary shadow-sm" : "bg-muted/20 text-muted-foreground/40"
                            )}>
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div className="space-y-0.5">
                                <Label htmlFor="is_active" className="text-sm font-black tracking-tight cursor-pointer">Conta Ativa</Label>
                                <p className="text-[10px] text-muted-foreground/60 font-medium">Define se a conta será exibida nos seletores de transação.</p>
                            </div>
                        </div>
                        <Switch 
                            id="is_active" 
                            checked={!!watch("is_active")}
                            onCheckedChange={(checked) => setValue("is_active", checked)}
                            className="data-[state=checked]:bg-primary shadow-sm"
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full sm:w-auto h-14 px-12 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-5 w-5" />
                            )}
                            {isEditing ? "Salvar Alterações" : "Criar Conta Premium"}
                        </Button>
                    </DialogFooter>
                </form>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
