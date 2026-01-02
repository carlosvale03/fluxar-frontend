
import { CreditCard as CardIcon, MoreVertical, Edit, Trash2 } from "lucide-react"
import { CreditCard } from "@/types/cards"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { BANKS } from "@/data/banks"

interface CreditCardItemProps {
  card: CreditCard
  onEdit: (card: CreditCard) => void
  onDelete: (card: CreditCard) => void
}

export function CreditCardItem({ card, onEdit, onDelete }: CreditCardItemProps) {
  const router = useRouter()
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Calculate generic usage (mock if invoice data is missing)
  const currentTotal = card.current_invoice_total || 0
  const limit = card.limit || 0
  const available = card.available_limit !== undefined ? card.available_limit : (limit - currentTotal)
  const usagePercentage = limit > 0 ? ((limit - available) / limit) * 100 : 0

  // Helper to darken color for gradient
  function adjustBrightness(col: string, amt: number) {
      if (!col) return "#000000"
      let usePound = false;
      if (col[0] == "#") {
          col = col.slice(1);
          usePound = true;
      }
      var num = parseInt(col,16);
      var r = (num >> 16) + amt;
      if (r > 255) r = 255;
      else if  (r < 0) r = 0;
      var b = ((num >> 8) & 0x00) + amt;
      if (b > 255) b = 255;
      else if  (b < 0) b = 0;
      var g = (num & 0x0000ff) + amt;
      if (g > 255) g = 255;
      else if (g < 0) g = 0;
      return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);
  }

  return (
    <div 
        onClick={() => router.push(`/cartoes/${card.id}`)}
        className={cn(
            "group relative w-full aspect-[1.586] rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] p-6 flex flex-col justify-between text-white cursor-pointer",
            !card.color && "bg-gradient-to-br from-[#1a1a1a] to-[#4a4a4a]"
        )}
        style={card.color ? { backgroundColor: card.color } : undefined}
    >
      {/* Background Texture/Shine */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div className="flex items-center gap-2">
            <CardIcon className="h-8 w-8 text-white/80" />
            {card.institution && (
                <span className="font-semibold text-lg tracking-wide opacity-90">
                    {BANKS.find(b => b.value === card.institution)?.label || card.institution}
                </span>
            )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
             <Button 
                variant="ghost" 
                className="h-8 w-8 p-0 text-white hover:bg-white/10 hover:text-white cursor-pointer"
                onClick={(e) => e.stopPropagation()}
             >
              <span className="sr-only">Abrir menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/cartoes/${card.id}`)}>
               Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(card)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
                onClick={() => onDelete(card)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10 cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Content */}
      <div className="z-10 space-y-4">
          <div className="flex justify-between items-end">
              <div>
                <p className="font-medium tracking-wide truncate text-lg shadow-black/10 drop-shadow-md">{card.name}</p>
                <div className="flex items-center gap-1 mt-1 opacity-60">
                    <span className="font-mono text-[10px] tracking-widest">•••• •••• •••• ••••</span>
                </div>
              </div>
              <div className="text-right">
                  <p className="text-xs opacity-75 font-medium">Fatura Atual</p>
                  <p className="text-lg font-bold tracking-tight">{formatCurrency(currentTotal)}</p>
              </div>
          </div>
          
          <div className="space-y-1">
             <div className="flex justify-between text-xs opacity-80 font-medium">
                 <span>Utilizado: {formatCurrency(limit - available)}</span>
                 <span>Lim: {formatCurrency(limit)}</span>
             </div>
             <Progress value={usagePercentage} className="h-1.5 bg-black/20 [&>div]:bg-white/90" />
          </div>
      </div>
    </div>
  )
}
