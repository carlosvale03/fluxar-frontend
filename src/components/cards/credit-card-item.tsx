import Link from "next/link"
import { Edit, Trash2 } from "lucide-react"

import { CreditCard } from "@/types/cards"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { BANKS } from "@/data/banks"
import { deCentavos, formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"

interface CreditCardItemProps {
  card: CreditCard
  onEdit: (card: CreditCard) => void
  onDelete: (card: CreditCard) => void
}

// Acima deste uso do limite, a barra e o percentual passam para o laranja de alerta
const USO_EM_ALERTA = 90

interface BarraDoLimiteProps {
  // Valores em centavos
  utilizado: number
  limite: number
  className?: string
}

// AZ-25: uso do limite no mesmo desenho da Barra de rota (trilha em elevated,
// preenchimento em text-secondary, laranja perto do limite). O desvio da
// BarraDeRota não se aplica ao limite do cartão, então o texto é o percentual usado.
export function BarraDoLimite({ utilizado, limite, className }: BarraDoLimiteProps) {
  const percentual = limite > 0 ? (utilizado / limite) * 100 : 0
  const largura = Math.max(0, Math.min(100, percentual))
  const alerta = percentual >= USO_EM_ALERTA

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="relative h-1.5 flex-1 rounded-full bg-elevated"
        role="img"
        aria-label={`Limite: ${formatarMoeda(deCentavos(utilizado))} utilizados de ${formatarMoeda(deCentavos(limite))}, ${formatarPercentual(percentual)}`}
      >
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", alerta ? "bg-warn" : "bg-fg-secondary")}
          style={{ width: `${largura}%` }}
        />
      </div>
      <span aria-hidden="true" className={cn("value-m w-12 text-right", alerta ? "text-warn" : "text-muted-foreground")}>
        {formatarPercentual(percentual)}
      </span>
    </div>
  )
}

export function CreditCardItem({ card, onEdit, onDelete }: CreditCardItemProps) {
  // CONTRATO-16: os valores chegam como texto; a conta é feita em centavos
  const limit = paraCentavos(card.limit) || 0
  const currentTotal = card.current_invoice_total
  // FATURA-42: o limite disponível vem só do backend
  const available = paraCentavos(card.available_limit)

  // O limite utilizado é a diferença entre o limite total e o disponível
  const usedAmount = limit - available

  // A cor do cartão (ou a do banco) é dado do usuário (P-08): fica só na faixa lateral
  const bank = BANKS.find(b => b.value === card.institution)
  const displayColor = card.color || bank?.color || "var(--az-text-muted)"

  return (
    <Card interativo className="relative flex h-full flex-col gap-5 overflow-hidden p-5 pl-6">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: displayColor }} />

      <div className="min-w-0 pr-6">
        <p className="label text-muted-foreground">{bank?.label || "Meu cartão"}</p>
        <h3 className="display-s mt-1 truncate">
          {/* O link cobre o card inteiro; os botões de ação ficam acima dele */}
          <Link
            href={`/cartoes/${card.id}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {card.name}
          </Link>
        </h3>
      </div>

      <div>
        <p className="label mb-1 text-muted-foreground">Fatura atual</p>
        {/* Mesmo desenho do <Valor> neutro; fica num <p> porque a Ponte de
            Comando também mostra este card e procura os totais dela em <span> */}
        <p className="value-l whitespace-nowrap text-foreground">{formatarMoeda(currentTotal)}</p>
      </div>

      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Utilizado: {formatarMoeda(deCentavos(usedAmount))}</span>
          <span>Limite: {formatarMoeda(card.limit)}</span>
        </div>
        <BarraDoLimite utilizado={usedAmount} limite={limit} />
      </div>

      <div className="relative z-10 -mb-2 -mr-2 flex justify-end gap-0.5 border-t border-border pt-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Editar cartão"
          aria-label={`Editar cartão ${card.name}`}
          onClick={(e) => {
            e.stopPropagation()
            onEdit(card)
          }}
        >
          <Edit aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:text-outflow"
          title="Excluir cartão"
          aria-label={`Excluir cartão ${card.name}`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(card)
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </Card>
  )
}
