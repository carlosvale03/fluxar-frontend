"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Wallet, Landmark, Building, Palette, Check } from "lucide-react"

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
import { MoneyInput } from "@/components/ui/money-input"
import { ChevronDown, ChevronUp } from "lucide-react"
import { api } from "@/services/apiClient"
import { accountsService } from "@/services/accounts"
import { Account, AccountType, AccountTypeLabels } from "@/types/accounts"
import { BANKS } from "@/data/banks"
import { cn } from "@/lib/utils"
import { deCentavos, paraCentavos } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { usePlan } from "@/hooks/use-plan"

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
  // CONTRATO-17: o saldo inicial vai à API como texto decimal ("1234.56")
  initial_balance: z.string().refine((val) => !isNaN(paraCentavos(val)), {
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
  // Os dados foram salvos, mas o diálogo continua aberto (a inativação ou a
  // reativação foi recusada): a lista pode se atualizar sem fechar o diálogo
  onUpdated?: () => void
}

export function AccountFormDialog({ 
    account, 
    trigger, 
    onSuccess, 
    open: controlledOpen, 
    onOpenChange: setControlledOpen,
    defaultType = AccountType.CHECKING,
    onUpdated,
}: AccountFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // PERM-20: criar ou excluir muda o uso dos limites do /auth/me
  const { atualizarUso } = usePlan()
  const [isVisualOpen, setIsVisualOpen] = useState(true)
  
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
    setError,
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
        setIsVisualOpen(false) // Minimize when a specific bank is chosen
      }
    } else {
      setIsVisualOpen(true) // Expand when "Other" or no institution
    }
  }, [watchInstitution, setValue])

  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        type: account.type,
        initial_balance: account.initial_balance,
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
    // SALDO-54: o status não vai no PUT (o backend o ignora); o interruptor
    // inativa ou reativa a conta pelas rotas próprias
    const { is_active: ativa, ...dados } = data
    const payload = {
        ...dados,
        initial_balance: deCentavos(paraCentavos(data.initial_balance)),
        institution: data.institution === "other" ? "" : data.institution
    }

    if (isEditing && account) {
      const querAtiva = ativa ?? true
      const mudouStatus = querAtiva !== account.is_active
      const mudouDados =
        payload.name !== account.name ||
        payload.type !== account.type ||
        paraCentavos(payload.initial_balance) !== paraCentavos(account.initial_balance) ||
        (payload.institution ?? "") !== (account.institution ?? "") ||
        (payload.color ?? "") !== (account.color ?? "")
      let salvouDados = false
      let mudouNoBackend = false
      try {
        // Inativar: salva os dados antes, enquanto a conta ainda está ativa.
        // Reativar: reativa antes, para os dados irem a uma conta ativa
        if (mudouStatus && querAtiva) {
          await accountsService.reactivateAccount(account.id)
          mudouNoBackend = true
          void atualizarUso()
        }
        if (mudouDados || !mudouStatus) {
          await api.put(`/accounts/${account.id}/`, payload)
          salvouDados = true
        }
        if (mudouStatus && !querAtiva) {
          await accountsService.deactivateAccount(account.id)
          mudouNoBackend = true
          void atualizarUso()
        }
        toast.success(
          !mudouStatus ? "Conta atualizada." : querAtiva ? "Conta reativada." : "Conta inativada.",
        )
        setOpen?.(false)
        onSuccess?.()
      } catch (error) {
        // SALDO-49, SALDO-50 e SALDO-52: a recusa do backend vai ao Sonner, o
        // diálogo fica aberto e o interruptor volta ao status da conta
        if (mudouStatus && !mudouNoBackend) setValue("is_active", account.is_active)
        if (salvouDados || mudouNoBackend) onUpdated?.()
        tratarErro(error, {
          form: { setError },
          campos: ["name", "initial_balance"],
          mensagemPadrao: "Erro ao salvar conta.",
        })
      } finally {
        setIsLoading(false)
      }
      return
    }

    try {
      await api.post("/accounts/", payload)
      toast.success("Conta criada.")
      void atualizarUso()
      setOpen?.(false)
      onSuccess?.()
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo; o resto, ao Sonner
      tratarErro(error, {
        form: { setError },
        campos: ["name", "initial_balance"],
        mensagemPadrao: "Erro ao salvar conta.",
      })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="overflow-hidden p-0 sm:max-w-[520px]">
        <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
                <DialogHeader className="mb-6">
                    <div className="flex items-center gap-3">
                        {/* Prévia da cor escolhida (dado do usuário, P-08) */}
                        <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated"
                            style={{ color: watchColor }}
                        >
                            <Wallet className="h-5 w-5" />
                        </span>
                        <div>
                            <DialogTitle>
                                {isEditing ? "Editar Conta" : "Nova Conta"}
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                {isEditing
                                    ? "Altere os dados da conta."
                                    : "Cadastre uma conta bancária ou carteira."}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Seção 1: Identificação */}
                    <fieldset className="space-y-4">
                        <legend className="label mb-3 text-muted-foreground">Identificação</legend>

                        <div className="space-y-2">
                            <Label htmlFor="name">Nome amigável da conta</Label>
                            <Input
                                id="name"
                                placeholder="Ex.: Nubank Pessoal"
                                aria-invalid={!!errors.name}
                                aria-describedby={errors.name ? "name-erro" : undefined}
                                {...register("name")}
                            />
                            {errors.name && <p id="name-erro" className="text-xs text-outflow">{errors.name.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Instituição</Label>
                                <Select
                                    onValueChange={(val) => setValue("institution", val)}
                                    value={watchInstitution || "other"}
                                >
                                    <SelectTrigger>
                                        <div className="flex items-center gap-2">
                                            {(!watchInstitution || watchInstitution === "other") && (
                                                <Building className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                            )}
                                            <SelectValue placeholder="Banco ou Carteira" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="other">Outro / Carteira</SelectItem>
                                        <SelectGroup>
                                            <SelectLabel className="label text-muted-foreground">Principais bancos</SelectLabel>
                                            {BANKS.map((bank) => (
                                                <SelectItem key={bank.value} value={bank.value}>
                                                    <div className="flex items-center gap-2">
                                                        <span aria-hidden="true" className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: bank.color }} />
                                                        <span>{bank.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo de conta</Label>
                                <Select
                                    onValueChange={(val) => setValue("type", val as AccountType)}
                                    value={watch("type")}
                                >
                                    <SelectTrigger>
                                        <div className="flex items-center gap-2">
                                            <Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                            <SelectValue placeholder="Tipo" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(AccountTypeLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </fieldset>

                    {/* Seção 2: Financeiro */}
                    <fieldset className="space-y-4">
                        <legend className="label mb-3 text-muted-foreground">Saldo</legend>

                        <div className="space-y-2">
                            <Label htmlFor="initial_balance">Saldo inicial disponível</Label>
                            <MoneyInput
                                id="initial_balance"
                                value={watch("initial_balance")}
                                onValueChange={(val) => setValue("initial_balance", val ?? "")}
                                aria-invalid={!!errors.initial_balance}
                                aria-describedby={errors.initial_balance ? "initial_balance-erro" : undefined}
                            />
                            {errors.initial_balance && <p id="initial_balance-erro" className="text-xs text-outflow">{errors.initial_balance.message}</p>}
                        </div>
                    </fieldset>

                    {/* Seção 3: Visual */}
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setIsVisualOpen(!isVisualOpen)}
                            aria-expanded={isVisualOpen}
                            className="flex w-full cursor-pointer items-center justify-between rounded-sm"
                        >
                            <span className="label text-muted-foreground">Cor da conta</span>
                            <span className="flex items-center gap-1 text-sm text-fg-secondary transition-colors duration-fast hover:text-foreground">
                                {isVisualOpen ? "Recolher" : "Personalizar"}
                                {isVisualOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                            </span>
                        </button>

                        {isVisualOpen && (
                            <div className="space-y-4 rounded-lg border border-border p-4">
                                <div className="grid grid-cols-8 gap-2">
                                    {PRESET_COLORS.map((color) => {
                                        const isSelected = watchColor === color
                                        return (
                                            <button
                                                key={color}
                                                type="button"
                                                aria-label={`Cor ${color}`}
                                                aria-pressed={isSelected}
                                                className={cn(
                                                    "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-transform duration-fast ease-az-out hover:scale-110",
                                                    isSelected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                                                )}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setValue("color", color)}
                                            >
                                                {isSelected && (
                                                    <Check className="h-4 w-4 rounded-full bg-background p-0.5 text-foreground" aria-hidden="true" />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="flex flex-col items-start gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
                                    <Label htmlFor="cor-personalizada" className="flex shrink-0 items-center gap-2 text-sm text-fg-secondary">
                                        <Palette className="h-4 w-4" aria-hidden="true" />
                                        Cor personalizada
                                    </Label>

                                    <div className="flex w-full flex-1 items-center gap-3">
                                        <Input
                                            type="color"
                                            aria-label="Escolher cor"
                                            className="h-9 w-12 cursor-pointer p-1"
                                            value={watchColor || "#000000"}
                                            onChange={(e) => setValue("color", e.target.value)}
                                        />
                                        <Input
                                            id="cor-personalizada"
                                            placeholder="#HEXADECIMAL"
                                            value={watchColor}
                                            onChange={(e) => setValue("color", e.target.value)}
                                            className="flex-1 font-mono uppercase"
                                            maxLength={7}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SALDO-54: inativar e reativar valem só para uma conta que já existe */}
                    {isEditing && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_active" className="cursor-pointer text-sm font-semibold">Conta ativa</Label>
                            <p className="text-xs text-muted-foreground">Inativar tira a conta das listas e dos totais. O histórico continua.</p>
                        </div>
                        <Switch
                            id="is_active"
                            checked={!!watch("is_active")}
                            onCheckedChange={(checked) => setValue("is_active", checked)}
                        />
                    </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" loading={isLoading} className="w-full sm:w-auto">
                            {isEditing ? "Salvar Alterações" : "Criar conta"}
                        </Button>
                    </DialogFooter>
                </form>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
