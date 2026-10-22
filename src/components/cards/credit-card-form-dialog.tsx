"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import {
  CreditCard as CreditCardIcon,
  Palette,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { MoneyInput } from "@/components/ui/money-input"
import { formatarMoeda, maiorQueZero } from "@/lib/dinheiro"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils"
import { api } from "@/services/apiClient"
import { CreditCard } from "@/types/cards"
import { BANKS } from "@/data/banks"
import { Account, AccountType } from "@/types/accounts"
import { tratarErro } from "@/lib/erros"
import { usePlan } from "@/hooks/use-plan"

// ...

const cardSchema = z.object({
  name: z.string().min(1, "Informe o apelido do cartão."),
  // CONTRATO-17: o limite vai à API como texto decimal ("1234.56")
  limit: z.string().refine(maiorQueZero, {
      message: "Informe um limite maior que zero.",
  }),
  closing_day: z.string().refine((val) => {
      const num = Number(val)
      return !isNaN(num) && num >= 1 && num <= 31
  }, { message: "Escolha um dia de fechamento entre 1 e 31." }),
  due_day: z.string().refine((val) => {
      const num = Number(val)
      return !isNaN(num) && num >= 1 && num <= 31
  }, { message: "Escolha um dia de vencimento entre 1 e 31." }),
  institution: z.string().optional(),
  color: z.string().optional(),
  account_id: z.string().min(1, "Escolha a conta que paga a fatura."),
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
  // PERM-20: criar ou excluir muda o uso dos limites do /auth/me
  const { atualizarUso } = usePlan()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isVisualOpen, setIsVisualOpen] = useState(true)
  
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
    setError,
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
            const data = res.data
            setAccounts(data || [])
        }).catch(err => {
            console.error("Failed to fetch accounts", err)
            toast.error("Não foi possível carregar as contas. Feche o formulário e abra de novo.")
        })
    }
  }, [open])

  useEffect(() => {
    if (card) {
      reset({
        name: card.name,
        limit: card.limit,
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
          limit: data.limit,
          closing_day: Number(data.closing_day),
          due_day: Number(data.due_day),
          institution: data.institution,
          color: data.color,
          account_id: data.account_id
      }

      if (isEditing && card) {
        await api.put(`/credit-cards/${card.id}/`, payload)
        toast.success("Cartão atualizado.")
      } else {
        await api.post("/credit-cards/", payload)
        toast.success("Cartão criado.")
        void atualizarUso()
      }
      
      if (setOpen) setOpen(false)
      onSuccess?.()
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo; o resto, ao Sonner
      tratarErro(error, {
        form: { setError },
        campos: ["name", "limit", "closing_day", "due_day", "account_id"],
        mensagemPadrao: "Não foi possível salvar o cartão. Tente de novo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedBank = BANKS.find(b => b.value === watchedInstitution)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <form onSubmit={handleSubmit(onSubmit)}>
            {/* Cabeçalho com a prévia do cartão */}
            <div className="border-b border-border p-6">
                <DialogHeader className="mb-5">
                    <DialogTitle>
                        {isEditing ? "Editar cartão" : "Novo cartão"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Altere os dados do cartão de crédito." : "Cadastre um cartão de crédito ligado à conta que paga a fatura."}
                    </DialogDescription>
                </DialogHeader>

                {/* Prévia: superfície sóbria; a cor do cartão (dado do usuário, P-08) fica na faixa lateral */}
                <div aria-hidden="true" className="relative overflow-hidden rounded-lg border border-border bg-card p-4 pl-5">
                    <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: watchedColor || "var(--az-text-muted)" }} />
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="label text-muted-foreground">{selectedBank?.label || "Meu cartão"}</p>
                            <p className="display-s mt-1 truncate">{watchedName || "Nome do cartão"}</p>
                        </div>
                        <CreditCardIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-4">
                        <p className="label text-muted-foreground">Limite total</p>
                        <p className="value-l">{formatarMoeda(watchedLimit)}</p>
                    </div>
                </div>
            </div>

            {/* Campos */}
            <div className="max-h-[50vh] space-y-6 overflow-y-auto p-6">

                {/* Seção 1: Identidade */}
                <fieldset className="space-y-4">
                    <legend className="label mb-3 text-muted-foreground">Identificação</legend>

                    <div className="space-y-2">
                        <Label htmlFor="name">Apelido do cartão</Label>
                        <Input
                            id="name"
                            placeholder="Ex.: Nubank Principal"
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? "name-erro" : undefined}
                            {...register("name")}
                        />
                        {errors.name && <p id="name-erro" className="text-xs text-outflow">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="account_id">Conta que paga a fatura</Label>
                        <Select
                            onValueChange={(val) => setValue("account_id", val, { shouldValidate: true })}
                            value={watch("account_id")}
                        >
                            <SelectTrigger
                                id="account_id"
                                aria-invalid={!!errors.account_id}
                                aria-describedby={errors.account_id ? "account_id-erro" : undefined}
                                className={cn(errors.account_id && "border-outflow")}
                            >
                                <SelectValue placeholder="Selecione a conta para débito" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts
                                    .filter(acc => acc.is_active && (acc.type === AccountType.CHECKING || acc.type === AccountType.WALLET))
                                    .map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            <div className="flex items-center gap-2">
                                                <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.color || "var(--az-text-muted)" }} />
                                                {acc.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        {errors.account_id && <p id="account_id-erro" className="text-xs text-outflow">{errors.account_id.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="instituicao-do-cartao">Instituição</Label>
                                <Select
                                    onValueChange={(val) => {
                                        setValue("institution", val)
                                        const bankColor = BANKS.find(b => b.value === val)?.color
                                        if (bankColor) {
                                            setValue("color", bankColor)
                                            setIsVisualOpen(false)
                                        } else {
                                            setIsVisualOpen(true)
                                        }
                                    }}
                                    value={watch("institution")}
                                >
                                <SelectTrigger id="instituicao-do-cartao">
                                    <SelectValue placeholder="Opcional" />
                                </SelectTrigger>
                                <SelectContent>
                                    {BANKS.map((bank) => (
                                        <SelectItem key={bank.value} value={bank.value}>
                                            <div className="flex items-center gap-2">
                                                <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: bank.color }} />
                                                {bank.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="cor-do-cartao">Cor do cartão</Label>
                                <button
                                    type="button"
                                    onClick={() => setIsVisualOpen(!isVisualOpen)}
                                    aria-expanded={isVisualOpen}
                                    className="flex cursor-pointer items-center gap-1 rounded-sm text-xs text-fg-secondary transition-colors duration-fast hover:text-foreground"
                                >
                                    {isVisualOpen ? "Recolher" : "Personalizar"}
                                    {isVisualOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                                </button>
                            </div>

                            <div className={cn(
                                "relative flex h-9 items-center rounded-md border border-input px-3 transition-colors duration-fast focus-within:ring-2 focus-within:ring-ring",
                                isVisualOpen && "bg-elevated"
                            )}>
                                <input
                                    id="cor-do-cartao"
                                    type="color"
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    value={watch("color") || "#6366f1"}
                                    onChange={(e) => setValue("color", e.target.value)}
                                />
                                <span aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 rounded-full" style={{ background: watchedColor }} />
                                <span className="font-mono text-xs uppercase">{watchedColor}</span>
                                <Palette className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* Seção 2: Ciclo e Limites */}
                <fieldset className="space-y-4 border-t border-border pt-6">
                    <legend className="label mb-3 text-muted-foreground">Ciclo e limite</legend>

                    <div className="space-y-2">
                        <Label htmlFor="limit">Limite total de crédito</Label>
                        <MoneyInput
                            id="limit"
                            value={watch("limit")}
                            onValueChange={(val) => setValue("limit", val ?? "")}
                            aria-invalid={!!errors.limit}
                            aria-describedby={errors.limit ? "limit-erro" : undefined}
                        />
                        {errors.limit && <p id="limit-erro" className="text-xs text-outflow">{errors.limit.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="closing_day">Dia do fechamento</Label>
                            <Input
                                id="closing_day"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="31"
                                className="font-mono"
                                aria-invalid={!!errors.closing_day}
                                aria-describedby={errors.closing_day ? "closing_day-erro" : undefined}
                                {...register("closing_day")}
                            />
                            {errors.closing_day && <p id="closing_day-erro" className="text-xs text-outflow">{errors.closing_day.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_day">Dia do vencimento</Label>
                            <Input
                                id="due_day"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="31"
                                className="font-mono"
                                aria-invalid={!!errors.due_day}
                                aria-describedby={errors.due_day ? "due_day-erro" : undefined}
                                {...register("due_day")}
                            />
                            {errors.due_day && <p id="due_day-erro" className="text-xs text-outflow">{errors.due_day.message}</p>}
                        </div>
                    </div>
                </fieldset>
            </div>

            {/* Rodapé */}
            <div className="flex justify-end border-t border-border p-4">
                <Button
                    type="submit"
                    loading={isLoading}
                    className="w-full sm:w-auto"
                >
                    {isEditing ? "Salvar alterações" : "Criar cartão"}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
