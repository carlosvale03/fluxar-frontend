// P-16: os selos das Cartas avançadas saem dos números, nunca fixos
// ("medir antes de opinar", PRODUCT.md §1). Sem número, sem selo.

export type VarianteDoSelo = "success" | "warning" | "destructive"

export interface Selo {
  rotulo: string
  variante: VarianteDoSelo
}

// Poder de aporte (taxa de poupança, em %): a partir de 20% é saudável
export const APORTE_SAUDAVEL = 20
export const APORTE_EM_ATENCAO = 10

export function seloDoPoderDeAporte(taxa: number | null | undefined): Selo | null {
  if (typeof taxa !== "number" || !Number.isFinite(taxa)) return null
  if (taxa >= APORTE_SAUDAVEL) return { rotulo: "Saudável", variante: "success" }
  if (taxa >= APORTE_EM_ATENCAO) return { rotulo: "Atenção", variante: "warning" }
  return { rotulo: "Baixo", variante: "destructive" }
}

// Reserva (liquidez em meses de gasto): 6 meses fecham a reserva de emergência
export const RESERVA_COMPLETA = 6
export const RESERVA_PARCIAL = 3

export function seloDaReserva(meses: number | null | undefined): Selo | null {
  if (typeof meses !== "number" || !Number.isFinite(meses)) return null
  if (meses >= RESERVA_COMPLETA) return { rotulo: "Reserva completa", variante: "success" }
  if (meses >= RESERVA_PARCIAL) return { rotulo: "Reserva parcial", variante: "warning" }
  return { rotulo: "Reserva baixa", variante: "destructive" }
}
