// AZ-43 (DESIGN.md §3.4 e §6): o tema único dos gráficos. As cores são
// variáveis CSS, então mudam sozinhas com o tema claro e o escuro.

// Séries de categoria: até 5 com cor; o resto se agrupa em "Outros"
export const CORES_DAS_SERIES = [
  "var(--az-serie-1)",
  "var(--az-serie-2)",
  "var(--az-serie-3)",
  "var(--az-serie-4)",
  "var(--az-serie-5)",
] as const

export const COR_DE_OUTROS = "var(--az-serie-outros)"

export function corDaSerie(indice: number): string {
  return CORES_DAS_SERIES[indice % CORES_DAS_SERIES.length]
}

// Entrada e saída ficam fora das séries: são reservadas para a direção do dinheiro
export const COR_DE_ENTRADA = "var(--az-inflow)"
export const COR_DE_SAIDA = "var(--az-outflow)"

// Série real (ouro), prevista (tracejada) e a faixa de tolerância
export const COR_DO_REAL = "var(--az-gold-line)"
export const COR_DO_PREVISTO = "var(--az-text-muted)"
export const COR_DA_TOLERANCIA = "var(--az-tolerance)"

// Grade só horizontal e eixos em mono, sem linha de eixo
export const COR_DA_GRADE = "var(--az-border-subtle)"
export const COR_DO_EIXO = "var(--az-text-muted)"

export const PROPS_DA_GRADE = {
  vertical: false,
  stroke: COR_DA_GRADE,
} as const

export const PROPS_DO_EIXO = {
  axisLine: false,
  tickLine: false,
  tick: { fill: COR_DO_EIXO, fontSize: 12, fontFamily: "var(--font-plex-mono)" },
} as const

// Ponto atual: círculo de ouro com contorno da superfície
export const PONTO_ATUAL = { r: 5, fill: "var(--az-gold)", stroke: "var(--az-surface)", strokeWidth: 2 } as const

// Cursor do tooltip: linha fina da cor do previsto
export const CURSOR_DO_TOOLTIP = { stroke: COR_DO_PREVISTO, strokeWidth: 1, strokeDasharray: "4 4" } as const
