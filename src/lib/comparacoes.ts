import { paraCentavos } from "@/lib/dinheiro"

// REL-22 e REL-23: taxa sem receita e comparação com média zero aparecem como
// texto, nunca como "Infinity%", "NaN%" ou "null%".

export const TAXA_INDISPONIVEL = "Indisponível"
export const SEM_HISTORICO = "Sem histórico para comparar"

// REL-22: a taxa de poupança vem null quando não há receitas no mês
export function formatarTaxa(taxa: number | null | undefined): string {
  return typeof taxa === "number" && Number.isFinite(taxa) ? `${taxa}%` : TAXA_INDISPONIVEL
}

// REL-23: quanto o valor atual representa da média, em %; null quando a
// média é zero (sem histórico) ou não é um valor
export function percentualDaMedia(atual: string | null | undefined, media: string | null | undefined): number | null {
  const centavosDaMedia = paraCentavos(media)
  const centavosAtuais = paraCentavos(atual)
  if (!(centavosDaMedia > 0) || Number.isNaN(centavosAtuais)) return null
  return (centavosAtuais / centavosDaMedia) * 100
}
