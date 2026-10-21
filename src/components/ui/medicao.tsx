import { AlertTriangle, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"

// AZ-17 (DESIGN.md §5, Componentes de medição): Bússola, Anel de progresso e
// Barra de rota. Os três mostram o número em texto ao lado do desenho e têm
// rótulo para leitor de tela; a cor nunca é a única informação.

// Desvio a partir do qual o arco da bússola chega ao fim da escala (meia volta)
const FIM_DA_ESCALA = 50

function ponto(cx: number, cy: number, r: number, graus: number) {
  const rad = ((graus - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// Arco a partir do norte; graus positivos no sentido horário
function arco(cx: number, cy: number, r: number, graus: number) {
  const fim = ponto(cx, cy, r, graus)
  const inicio = ponto(cx, cy, r, 0)
  const horario = graus >= 0 ? 1 : 0
  return `M ${inicio.x} ${inicio.y} A ${r} ${r} 0 0 ${horario} ${fim.x} ${fim.y}`
}

interface BussolaProps {
  // Desvio em %: positivo acima do plano, negativo abaixo
  desvio: number
  tolerancia: number
  tamanho?: number
  className?: string
}

export function Bussola({ desvio, tolerancia, tamanho = 64, className }: BussolaProps) {
  const dentro = Math.abs(desvio) <= tolerancia
  const graus = (Math.max(-FIM_DA_ESCALA, Math.min(FIM_DA_ESCALA, desvio)) / FIM_DA_ESCALA) * 180
  const grausDaTolerancia = (Math.min(tolerancia, FIM_DA_ESCALA) / FIM_DA_ESCALA) * 180
  const r = 27
  const situacao = dentro ? "dentro" : "fora"
  const rotulo = `Desvio de ${formatarPercentual(desvio)} ${desvio < 0 ? "abaixo" : "acima"} do plano, ${situacao} da tolerância de ${formatarPercentual(tolerancia)}`

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" role="img" aria-label={rotulo}>
        <circle cx="32" cy="32" r={r} fill="none" className="stroke-border" strokeWidth="6" />
        {/* Zona de tolerância dos dois lados do norte */}
        <path d={arco(32, 32, r, grausDaTolerancia)} fill="none" stroke="var(--az-tolerance)" strokeWidth="6" />
        <path d={arco(32, 32, r, -grausDaTolerancia)} fill="none" stroke="var(--az-tolerance)" strokeWidth="6" />
        {graus !== 0 && (
          <path
            d={arco(32, 32, r, graus)}
            fill="none"
            className={dentro ? "stroke-gold-line" : "stroke-warn"}
            strokeWidth="6"
            strokeLinecap="round"
          />
        )}
        {/* Norte: o plano */}
        <line x1="32" y1="1" x2="32" y2="11" className="stroke-foreground" strokeWidth="2" />
      </svg>
      <div aria-hidden="true">
        <p className={cn("value-l", !dentro && "text-warn")}>{formatarPercentual(desvio)}</p>
        <p className="text-xs text-muted-foreground">tolerância {formatarPercentual(tolerancia)}</p>
      </div>
    </div>
  )
}

interface AnelDeProgressoProps {
  // 0 a 100 (acima de 100 conta como concluído)
  percentual: number
  tamanho?: number
  // Rótulo para leitor de tela ("Reserva de emergência")
  nome: string
  className?: string
}

export function AnelDeProgresso({ percentual, tamanho = 52, nome, className }: AnelDeProgressoProps) {
  const concluido = percentual >= 100
  const r = 21
  const circunferencia = 2 * Math.PI * r
  const preenchido = (Math.max(0, Math.min(100, percentual)) / 100) * circunferencia

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 52 52"
      role="img"
      aria-label={`${nome}: ${formatarPercentual(Math.min(percentual, 100))}${concluido ? ", alcançado" : ""}`}
      className={className}
    >
      <circle cx="26" cy="26" r={r} fill="none" className="stroke-border" strokeWidth="5" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        className={concluido ? "stroke-inflow" : "stroke-gold-line"}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${preenchido} ${circunferencia}`}
        transform="rotate(-90 26 26)"
      />
      {concluido && <Check x="16" y="16" width="20" height="20" className="text-inflow" aria-hidden="true" />}
    </svg>
  )
}

interface BarraDeRotaProps {
  nome: string
  // Texto decimal da API ou número em reais
  gasto: string | number
  limite: string | number
  // Tolerância em %, desenhada logo depois da marca do limite
  tolerancia?: number
  className?: string
}

// Bullet chart: trilha, zona de tolerância, preenchimento e a marca do limite
export function BarraDeRota({ nome, gasto, limite, tolerancia = 0, className }: BarraDeRotaProps) {
  const centavosGastos = paraCentavos(gasto)
  const centavosDoLimite = paraCentavos(limite)
  const desvio = centavosDoLimite > 0 ? ((centavosGastos - centavosDoLimite) / centavosDoLimite) * 100 : 0
  const acima = centavosGastos > centavosDoLimite
  // A escala cobre o maior entre o gasto e o limite com a tolerância
  const escala = Math.max(centavosGastos, centavosDoLimite * (1 + tolerancia / 100), 1)
  const largura = (centavosGastos / escala) * 100
  const marca = (centavosDoLimite / escala) * 100
  const larguraDaTolerancia = ((centavosDoLimite * tolerancia) / 100 / escala) * 100
  const textoDoDesvio = `${desvio > 0 ? "+" : desvio < 0 ? "−" : ""}${formatarPercentual(desvio)}`

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{nome}</span>
        <span className={cn("value-m whitespace-nowrap", acima ? "text-warn" : "text-fg-secondary")}>
          {formatarMoeda(gasto)} / {formatarMoeda(limite)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="relative h-1.5 flex-1 rounded-full bg-elevated"
          role="img"
          aria-label={`${nome}: ${formatarMoeda(gasto)} de ${formatarMoeda(limite)}, ${formatarPercentual(desvio)} ${acima ? "acima" : "abaixo"} do limite`}
        >
          {tolerancia > 0 && (
            <span className="absolute inset-y-0" style={{ left: `${marca}%`, width: `${larguraDaTolerancia}%`, background: "var(--az-tolerance)" }} />
          )}
          <span
            className={cn("absolute inset-y-0 left-0 rounded-full", acima ? "bg-warn" : "bg-fg-secondary")}
            style={{ width: `${largura}%` }}
          />
          <span className="absolute -top-[3px] h-3 w-0.5 bg-foreground" style={{ left: `calc(${marca}% - 1px)` }} />
        </div>
        <span aria-hidden="true" className={cn("value-m flex w-16 items-center justify-end gap-1", acima ? "text-warn" : "text-muted-foreground")}>
          {acima && <AlertTriangle className="h-3.5 w-3.5" />}
          {textoDoDesvio}
        </span>
      </div>
    </div>
  )
}
