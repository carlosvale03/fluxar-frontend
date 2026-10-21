import { cn } from "@/lib/utils"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"

type Direcao = "entrada" | "saida" | "transferencia" | "neutro"

interface ValorProps {
  // Texto decimal da API ("1234.56") ou número em reais
  valor: string | number | null | undefined
  // Sem direção, o sinal do próprio valor decide entre entrada e saída
  direcao?: Direcao
  // "m" para tabelas e listas, "l" para indicadores
  tamanho?: "m" | "l"
  // Tira o "R$" (colunas de tabela que já dizem a moeda no cabeçalho)
  semMoeda?: boolean
  className?: string
}

const SINAL: Record<Direcao, string> = { entrada: "+ ", saida: "− ", transferencia: "→ ", neutro: "" }
const COR: Record<Direcao, string> = {
  entrada: "text-inflow",
  saida: "text-outflow",
  transferencia: "text-foreground",
  neutro: "text-foreground",
}

// AZ-44 (DESIGN.md §5, Tabelas): valor em mono com sinal e cor de direção.
// A cor nunca vem sozinha: o sinal (+, −, →) diz a mesma coisa em texto.
export function Valor({ valor, direcao, tamanho = "m", semMoeda = false, className }: ValorProps) {
  const centavos = paraCentavos(valor ?? 0)
  const efetiva: Direcao = direcao ?? (centavos > 0 ? "entrada" : centavos < 0 ? "saida" : "neutro")
  const absoluto = Math.abs(centavos) / 100
  const formatado = formatarMoeda(absoluto)
  const texto = semMoeda ? formatado.replace(/^R\$\s?/, "") : formatado

  return (
    <span className={cn(tamanho === "l" ? "value-l" : "value-m", "whitespace-nowrap", COR[efetiva], className)}>
      {SINAL[efetiva]}
      {texto}
    </span>
  )
}

interface VariacaoProps {
  // Variação em %, ou null quando não há base para comparar
  percentual: number | null | undefined
  // Para gastos, subir é ruim; para saldo e entradas, subir é bom
  subirEBom?: boolean
  // Texto depois do número ("vs setembro")
  referencia?: string
  className?: string
}

// AZ-44: variação percentual com seta e cor; sem base, mostra o motivo em texto
export function Variacao({ percentual, subirEBom = true, referencia, className }: VariacaoProps) {
  if (typeof percentual !== "number" || !Number.isFinite(percentual)) {
    return <span className={cn("text-sm text-muted-foreground", className)}>Sem histórico para comparar</span>
  }

  const subiu = percentual > 0
  const parado = percentual === 0
  const bom = parado ? null : subiu === subirEBom
  const seta = parado ? "■" : subiu ? "▲" : "▼"
  const cor = bom === null ? "text-muted-foreground" : bom ? "text-inflow" : "text-outflow"

  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      <span className={cn("value-m", cor)}>
        <span aria-hidden="true">{seta} </span>
        <span className="sr-only">{parado ? "Sem variação:" : subiu ? "Subiu" : "Caiu"} </span>
        {formatarPercentual(percentual)}
      </span>
      {referencia && <> {referencia}</>}
    </span>
  )
}
