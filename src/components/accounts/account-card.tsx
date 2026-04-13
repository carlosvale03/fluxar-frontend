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

  const color = account.color || "#000000"
  
  return (
    <div className={cn("group relative h-full", !account.is_active && "opacity-60")}>
        <div className={cn(
            "rounded-2xl border border-border/60 bg-card transition-all cursor-default overflow-hidden h-full flex flex-col relative",
            "hover:bg-muted/30 hover:border-primary/20 hover:shadow-xl hover:shadow-black/5 hover:scale-[1.02] hover:z-20"
        )}>
            {/* Account Color Indicator Bar - Integrated directly at the top */}
            <div 
                className="w-full h-1.5 opacity-80 group-hover:opacity-100 transition-all shrink-0" 
                style={{ backgroundColor: color }}
            />

            <div className="p-4 sm:p-6 flex flex-col h-full space-y-3 sm:space-y-5">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Soft Squircle Icon */}
                        <div 
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0 transition-transform duration-500 group-hover:rotate-3 group-hover:scale-110"
                            style={{ backgroundColor: `${color}15`, color: color }}
                        >
                            <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                            <h3 className="font-bold text-base sm:text-lg leading-tight truncate pr-10 text-foreground/90">
                                {account.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 rounded-full px-2 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-wider">
                                    {AccountTypeLabels[account.type]}
                                </Badge>
                                {!account.is_active && (
                                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-900/50 rounded-full px-2 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-wider">
                                        Inativa
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="py-1 sm:py-2">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1 sm:mb-1.5 opacity-70 text-accent">Saldo Atual</p>
                    <div className="text-xl sm:text-3xl font-black tracking-tighter tabular-nums text-foreground">
                        {formatCurrency(account.balance)}
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-3 sm:pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                        <span className="text-[8px] sm:text-[9px] text-muted-foreground font-black uppercase tracking-widest truncate max-w-[120px] sm:max-w-[150px]">
                            {account.institution || "Personal"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Floating Action Buttons (F.A.B) */}
            <div className={cn(
                "flex gap-1 absolute top-3 right-2 sm:top-4 sm:right-3 p-1 rounded-xl transition-all duration-300",
                "bg-background/90 backdrop-blur-md shadow-lg border border-border/40",
                "opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 scale-90 group-hover:scale-100 z-30"
            )}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-lg" 
                    onClick={(e) => { e.stopPropagation(); onEdit(account) }}
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg" 
                    onClick={(e) => { e.stopPropagation(); onDelete(account) }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
  )
}
