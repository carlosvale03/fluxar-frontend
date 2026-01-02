"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

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
      color: "#000000",
      account_id: "",
    },
  })

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
        color: card.color || "#000000",
        account_id: card.account_id || "",
      })
    } else {
        reset({
            name: "",
            limit: "0",
            closing_day: "1",
            due_day: "10",
            institution: "",
            color: "#000000",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
          <DialogDescription>
            {isEditing 
                ? "Altere os dados do seu cartão de crédito." 
                : "Cadastre um novo cartão de crédito vinculado a uma conta."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Nome do Cartão</label>
            <Input 
                id="name" 
                placeholder="Ex: Nubank Platinum" 
                {...register("name")} 
                className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
          </div>

          <div className="space-y-2">
             <label htmlFor="account_id" className="text-sm font-medium">Conta de Pagamento</label>
             <Select 
                 onValueChange={(val) => setValue("account_id", val)}
                 value={watch("account_id")}
             >
                 <SelectTrigger className={errors.account_id ? "border-red-500" : ""}>
                     <SelectValue placeholder="Selecione a conta principal" />
                 </SelectTrigger>
                 <SelectContent>
                     {accounts.map(acc => (
                         <SelectItem key={acc.id} value={acc.id}>
                             {acc.name}
                         </SelectItem>
                     ))}
                 </SelectContent>
             </Select>
             {errors.account_id && <span className="text-xs text-red-500">{errors.account_id.message}</span>}
          </div>

          <div className="space-y-2">
            <label htmlFor="institution" className="text-sm font-medium">Instituição</label>
            <Select 
                onValueChange={(val) => {
                    setValue("institution", val)
                    const bankColor = BANKS.find(b => b.value === val)?.color
                    if (bankColor) setValue("color", bankColor, { shouldDirty: true })
                }} 
                value={watch("institution")}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                    {BANKS.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ background: bank.color }} />
                                {bank.label}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <input type="hidden" {...register("institution")} />
          </div>

          <div className="space-y-2">
            <label htmlFor="color" className="text-sm font-medium">Cor</label>
            <div className="flex gap-2">
                <Input 
                    id="color" 
                    type="color" 
                    className="w-12 p-1 h-9 cursor-pointer"
                    value={watch("color") || "#000000"}
                    onChange={(e) => setValue("color", e.target.value)}
                />
                <Input 
                     placeholder="#000000"
                     {...register("color")}
                     value={watch("color")}
                     className="flex-1 uppercase"
                />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="limit" className="text-sm font-medium">Limite Total</label>
            <Input 
                id="limit" 
                type="number" 
                step="0.01" 
                {...register("limit")} 
            />
            {errors.limit && <span className="text-xs text-red-500">{errors.limit.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label htmlFor="closing_day" className="text-sm font-medium">Dia Fechamento</label>
                <Input 
                    id="closing_day" 
                    type="number" 
                    min="1" 
                    max="31"
                    {...register("closing_day")} 
                />
                {errors.closing_day && <span className="text-xs text-red-500">{errors.closing_day.message}</span>}
            </div>
            <div className="space-y-2">
                <label htmlFor="due_day" className="text-sm font-medium">Dia Vencimento</label>
                <Input 
                    id="due_day" 
                    type="number" 
                    min="1" 
                    max="31"
                    {...register("due_day")} 
                />
                {errors.due_day && <span className="text-xs text-red-500">{errors.due_day.message}</span>}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
