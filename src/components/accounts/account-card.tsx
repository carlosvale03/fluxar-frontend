import { Edit, Trash2, Wallet, RefreshCcw, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Valor } from "@/components/ui/valor"
import { Account, AccountTypeLabels } from "@/types/accounts"
import { cn } from "@/lib/utils"
import { paraCentavos } from "@/lib/dinheiro"

interface AccountCardProps {
  account: Account
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onAdjustment?: (account: Account) => void
  // SALDO-51: só a conta inativa mostra a ação de reativar
  onReactivate?: (account: Account) => void
}

// AZ-25: card estático (sem seta nem hover); as ações ficam sempre à vista,
// inclusive no teclado e no celular. A cor da conta é dado do usuário (P-08).
export function AccountCard({ account, onEdit, onDelete, onAdjustment, onReactivate }: AccountCardProps) {
  const color = account.color || "var(--az-text-muted)"
  const negativo = paraCentavos(account.balance) < 0

  return (
    <Card className={cn("relative flex h-full w-full min-w-0 flex-col overflow-hidden", !account.is_active && "opacity-70")}>
        {/* Cor da conta: uma faixa fina no lado esquerdo */}
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />

        <div className="flex h-full w-full min-w-0 flex-col gap-4 p-5 pl-6">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated"
                        style={{ color }}
                    >
                        <Wallet className="h-5 w-5" />
                    </span>

                    <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="display-s truncate">
                            {account.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary">
                                {AccountTypeLabels[account.type]}
                            </Badge>
                            {!account.is_active && (
                                <Badge variant="warning">
                                    Inativa
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="-mr-2 -mt-1 flex shrink-0 gap-0.5">
                    {account.is_active && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Reajustar Saldo"
                        onClick={(e) => { e.stopPropagation(); onAdjustment?.(account) }}
                    >
                        <RefreshCcw aria-hidden="true" />
                    </Button>
                    )}
                    {/* Conta inativa não se edita (o backend devolve 404): só reativa (SALDO-51) */}
                    {account.is_active && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar Conta"
                        onClick={(e) => { e.stopPropagation(); onEdit(account) }}
                    >
                        <Edit aria-hidden="true" />
                    </Button>
                    )}
                    {account.is_active && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-outflow"
                        title="Excluir Conta"
                        onClick={(e) => { e.stopPropagation(); onDelete(account) }}
                    >
                        <Trash2 aria-hidden="true" />
                    </Button>
                    )}
                </div>
            </div>

            <div>
                <p className="label mb-1 text-muted-foreground">Saldo atual</p>
                <Valor valor={account.balance} direcao={negativo ? "saida" : "neutro"} tamanho="l" />
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="truncate text-xs text-muted-foreground">
                    {account.institution || "Pessoal"}
                </span>
                {!account.is_active && onReactivate && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onReactivate(account) }}
                    >
                        <RotateCcw aria-hidden="true" />
                        Reativar
                    </Button>
                )}
            </div>
        </div>
    </Card>
  )
}
