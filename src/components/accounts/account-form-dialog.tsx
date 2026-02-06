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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { api } from "@/services/apiClient"
import { Account, AccountType, AccountTypeLabels } from "@/types/accounts"
import { BANKS } from "@/data/banks"

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
      color: "#000000",
      is_active: true,
    },
  })

  // Auto-fill color when institution changes
  const selectedInstitution = watch("institution")
  useEffect(() => {
    if (selectedInstitution) {
      const bank = BANKS.find(b => b.value === selectedInstitution)
      if (bank) {
        setValue("color", bank.color)
      }
    }
  }, [selectedInstitution, setValue])

  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        type: account.type,
        initial_balance: account.initial_balance.toString(),
        institution: account.institution || "",
        color: account.color || "#000000",
        is_active: account.is_active,
      })
    } else {
        reset({
            name: "",
            type: defaultType,
            initial_balance: "0",
            institution: "",
            color: "#000000",
            is_active: true,
        })
    }
  }, [account, reset, open])

  const onSubmit = async (data: AccountFormValues) => {
    setIsLoading(true)
    try {
      const payload = {
          ...data,
          initial_balance: Number(data.initial_balance),
          is_active: data.is_active ?? true
      }

      if (isEditing && account) {
        await api.put(`/accounts/${account.id}/`, payload)
        toast.success("Conta atualizada com sucesso!")
      } else {
        await api.post("/accounts/", payload)
        toast.success("Conta criada com sucesso!")
      }
      
      if (setOpen) setOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Erro ao salvar conta:", error.response?.data)
      let msg = "Erro ao salvar conta. Verifique o console."
      
      const data = error.response?.data
      if (data) {
          if (typeof data === 'string') {
              msg = data
          } else if (data.detail) {
              msg = data.detail
          } else if (Array.isArray(data)) {
              msg = data[0]
          } else {
              // Pega a primeira mensagem de erro de qualquer campo
              const firstKey = Object.keys(data)[0]
              const firstError = data[firstKey]
              msg = Array.isArray(firstError) ? `${firstKey}: ${firstError[0]}` : String(firstError)
          }
      }
      
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          <DialogDescription>
            {isEditing 
                ? "Faça alterações na sua conta aqui." 
                : "Adicione uma nova conta para gerenciar suas finanças."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Nome da Conta</label>
            <Input 
                id="name" 
                placeholder="Ex: Nubank, Carteira Principal..." 
                {...register("name")} 
                className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select 
                    onValueChange={(val) => setValue("type", val as AccountType)} 
                    value={watch("type")}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Tipos de Conta</SelectLabel>
                            {Object.entries(AccountTypeLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {errors.type && <span className="text-xs text-red-500">{errors.type.message}</span>}
            </div>

            <div className="space-y-2">
                <label htmlFor="initial_balance" className="text-sm font-medium">Saldo Inicial</label>
                <Input 
                    id="initial_balance" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    {...register("initial_balance")} 
                />
                {errors.initial_balance && <span className="text-xs text-red-500">{errors.initial_balance.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Instituição</label>
                <Select 
                    onValueChange={(val) => setValue("institution", val)} 
                    value={watch("institution") || ""}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="other">Outro / Nenhum</SelectItem>
                        {BANKS.map((bank) => (
                            <SelectItem key={bank.value} value={bank.value}>
                                {bank.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label htmlFor="color" className="text-sm font-medium">Cor</label>
                <div className="flex gap-2">
                    <Input 
                        id="color" 
                        type="color" 
                        value={watch("color") || "#000000"}
                        onChange={(e) => setValue("color", e.target.value)}
                        className="w-12 p-1 cursor-pointer"
                    />
                    <Input 
                        placeholder="#000000" 
                        {...register("color")} 
                        className="uppercase"
                    />
                </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch 
                id="is_active" 
                checked={!!watch("is_active")}
                onCheckedChange={(checked) => setValue("is_active", checked)}
            />
            <Label htmlFor="is_active">Conta Ativa</Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Criar Conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
