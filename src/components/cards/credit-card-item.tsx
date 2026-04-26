
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
  const limit = Number(card.limit) || 0
  const currentTotal = Number(card.current_invoice_total) || 0
  const available = card.available_limit !== undefined ? Number(card.available_limit) : (limit - currentTotal)
  
  // O limite utilizado é a diferença entre o limite total e o disponível
  const usedAmount = limit - available
  const usagePercentage = limit > 0 ? (usedAmount / limit) * 100 : 0

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

  const bankColor = BANKS.find(b => b.value === card.institution)?.color
  const displayColor = card.color || bankColor || "#1a1a1a"

  return (
    <div 
        onClick={() => router.push(`/cartoes/${card.id}`)}
        className={cn(
            "group relative w-full aspect-[1.586] rounded-[32px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 p-7 flex flex-col justify-between text-white cursor-pointer select-none",
            !displayColor && "bg-gradient-to-br from-[#1a1a1a] to-[#4a4a4a]"
        )}
        style={{ 
            background: `linear-gradient(135deg, ${displayColor} 0%, ${displayColor}CC 100%)` 
        }}
    >
      {/* Glass & Shine Effects */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

      {/* Header: Chip & Bank */}
      <div className="flex justify-between items-start z-10">
        <div className="w-11 h-8 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-md shadow-inner flex flex-col gap-1 p-1 opacity-90 group-hover:scale-110 transition-transform duration-500">
            <div className="h-full border-r border-black/10" />
            <div className="w-full h-px bg-black/5" />
        </div>
        
        <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-[0.2em] text-white/60 uppercase italic">
                    {BANKS.find(b => b.value === card.institution)?.label || "Fluxar Pay"}
                </span>
                <CardIcon className="h-4 w-4 text-white/60" />
            </div>

            {/* Floating Action Buttons (FAB) - Hover Only */}
            <div className="mt-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1 p-1 bg-white/10 backdrop-blur-md shadow-xl border border-white/20 rounded-2xl pointer-events-none group-hover:pointer-events-auto">
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7 rounded-xl text-white hover:bg-white/20 transition-all" 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(card);
                    }}
                >
                    <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7 rounded-xl text-white hover:bg-red-500/40 transition-all" 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(card);
                    }}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
      </div>
      
      {/* Middle: Card Identity */}
      <div className="z-10 mt-auto mb-4">
          <div className="flex justify-between items-end gap-4">
              <div className="space-y-1 overflow-hidden">
                <h4 className="text-[9px] font-black text-white/40 tracking-[0.2em] uppercase">Nome no Cartão</h4>
                <p className="text-sm font-black text-white tracking-[0.15em] uppercase truncate drop-shadow-md">
                    {card.name}
                </p>
                <div className="flex items-center gap-1 opacity-30 group-hover:opacity-50 transition-opacity">
                    <span className="text-[8px] tracking-[0.3em]">•••• •••• •••• ••••</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                  <h4 className="text-[9px] font-black text-white/40 tracking-[0.2em] uppercase mb-1">Fatura Atual</h4>
                  <p className="text-xl font-black text-white drop-shadow-lg leading-none">
                    {formatCurrency(currentTotal)}
                  </p>
              </div>
          </div>
      </div>

      {/* Footer: Limit & Progress */}
      <div className="z-10 space-y-3">
          <div className="space-y-1.5">
             <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/50">
                 <span>Utilizado: {formatCurrency(usedAmount)}</span>
                 <div className="flex items-center gap-3">
                    <span>Limite: {formatCurrency(limit)}</span>
                    {/* Mastercard Circles Effect */}
                    <div className="flex -space-x-2.5 opacity-40 group-hover:opacity-70 transition-opacity">
                        <div className="h-6 w-6 rounded-full bg-white/40 border border-white/20" />
                        <div className="h-6 w-6 rounded-full bg-white/20 border border-white/10" />
                    </div>
                 </div>
             </div>
             <Progress 
                value={usagePercentage} 
                className="h-1.5 bg-black/20 border border-white/5 overflow-hidden rounded-full [&>div]:bg-gradient-to-r [&>div]:from-white/90 [&>div]:to-white/60" 
             />
          </div>
      </div>
    </div>
  )
}
