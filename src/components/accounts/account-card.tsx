import { MoreVertical, Edit, Trash2, Wallet, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Account, AccountTypeLabels } from "@/types/accounts"
import { cn } from "@/lib/utils"

interface AccountCardProps {
  account: Account
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Determine styles based on color
  const color = account.color || "#000000"
  // Should we apply background or just border?
  // User asked for visual richness. Let's try a subtle gradient border or status line.
  
  return (
    <Card className={cn("hover:shadow-md transition-shadow transition-all relative overflow-hidden cursor-default", !account.is_active && "opacity-60")}>
       <div 
          className="absolute top-0 left-0 w-1 h-full" 
          style={{ backgroundColor: color }}
        />
       
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {account.name}
          {!account.is_active && <Badge variant="outline" className="text-[10px] h-5">Inativa</Badge>}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
              <span className="sr-only">Abrir menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(account)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem disabled title="Em breve" className="cursor-not-allowed opacity-50">
              <RefreshCcw className="mr-2 h-4 w-4" /> Reajustar Saldo
            </DropdownMenuItem>
            <DropdownMenuItem 
                onClick={() => onDelete(account)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10 cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pl-6">
        <div className="text-2xl font-bold">{formatCurrency(account.balance)}</div>
        <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
             {account.institution ? `Instituição: ${account.institution}` : 'Saldo Atual'}
            </p>
            <Badge variant="secondary" className="font-normal">
                {AccountTypeLabels[account.type]}
            </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
