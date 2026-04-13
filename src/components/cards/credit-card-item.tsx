
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
            "group relative w-full aspect-[1.586] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 p-6 flex flex-col justify-between text-white cursor-pointer",
            !card.color && "bg-gradient-to-br from-[#1a1a1a] to-[#4a4a4a]"
        )}
        style={card.color ? { backgroundColor: card.color } : undefined}
    >
      {/* Background Texture/Shine */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-700" />

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div className="flex items-center gap-2">
            <CardIcon className="h-8 w-8 text-white/80" />
            {card.institution && (
                <span className="font-bold text-lg tracking-wide opacity-90">
                    {BANKS.find(b => b.value === card.institution)?.label || card.institution}
                </span>
            )}
        </div>
        
        {/* Floating Action Buttons (FAB) - Hover Only */}
        <div className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1.5 p-1.5 bg-background/20 backdrop-blur-md shadow-lg border border-white/10 rounded-2xl pointer-events-none group-hover:pointer-events-auto">
            <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-xl text-white hover:bg-white/20 transition-all" 
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(card);
                }}
            >
                <Edit className="h-4 w-4" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-xl text-white hover:bg-red-500/40 transition-all" 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(card);
                }}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
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
