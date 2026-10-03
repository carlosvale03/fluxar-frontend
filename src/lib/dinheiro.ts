// CONTRATO-16 a CONTRATO-19 (AD-041): toda conta de dinheiro é feita em
// centavos inteiros, a leitura do que o usuário digita segue AD-009 e há um
// formatador único em reais.

type Valor = string | number | null | undefined

const DECIMAL_DA_API = /^(-?)(\d+)(?:\.(\d+))?$/

// CONTRATO-17: "1234.56" vira 123456, sem passar por ponto flutuante.
// Vazio, null e undefined valem zero; texto fora do formato decimal dá NaN.
export function paraCentavos(valor: Valor): number {
  if (valor === null || valor === undefined || valor === "") return 0
  if (typeof valor === "number") return Math.round(valor * 100)

  const partes = DECIMAL_DA_API.exec(valor.trim())
  if (!partes) return NaN
  const [, sinal, inteiro, fracao = ""] = partes
  const casas = (fracao + "000").slice(0, 3)
  // Meio para cima pela terceira casa, como o dinheiro() do backend
  const centavos = Number(inteiro) * 100 + Math.floor(Number(casas) / 10) + (Number(casas[2]) >= 5 ? 1 : 0)
  return sinal === "-" && centavos !== 0 ? -centavos : centavos
}

// CONTRATO-16: centavos inteiros para o texto da API ("1234.56").
export function deCentavos(centavos: number): string {
  const absoluto = Math.abs(centavos)
  const texto = `${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, "0")}`
  return centavos < 0 ? `-${texto}` : texto
}

const MILHAR_E_DECIMAL = /^(\d{1,3}(?:\.\d{3})*|\d+),(\d{0,2})$/
const SO_DECIMAL = /^(\d*)\.(\d{1,2})$/

// CONTRATO-19 e CONTRATO-20 (AD-009): com vírgula, a vírgula é decimal e os
// pontos são de milhar; sem vírgula, os pontos são de milhar quando todos os
// grupos depois deles têm três dígitos e a parte antes do primeiro ponto não
// é zero, e decimal nos demais casos. Devolve o texto da API ou null quando
// o texto não é um valor (ou é negativo sem `negativo`).
export function lerValorDigitado(texto: string, { negativo = false }: { negativo?: boolean } = {}): string | null {
  let limpo = texto.replace(/R\$/g, "").replace(/\s/g, "")
  const menos = limpo.startsWith("-")
  if (menos) {
    if (!negativo) return null
    limpo = limpo.slice(1)
  }
  if (!limpo) return null

  let inteiro: string
  let fracao = ""
  if (limpo.includes(",")) {
    const partes = MILHAR_E_DECIMAL.exec(limpo)
    if (!partes) return null
    inteiro = partes[1].replace(/\./g, "")
    fracao = partes[2]
  } else if (limpo.includes(".")) {
    const grupos = limpo.split(".")
    const milhar =
      /^\d+$/.test(grupos[0]) && Number(grupos[0]) !== 0 && grupos.slice(1).every((g) => /^\d{3}$/.test(g))
    if (milhar) {
      inteiro = grupos.join("")
    } else {
      const partes = SO_DECIMAL.exec(limpo)
      if (!partes) return null
      inteiro = partes[1] || "0"
      fracao = partes[2]
    }
  } else if (/^\d+$/.test(limpo)) {
    inteiro = limpo
  } else {
    return null
  }

  const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"))
  return deCentavos(menos ? -centavos : centavos)
}

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const MOEDA_COMPACTA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

// CONTRATO-18: o formatador único em reais ("R$ 1.234,56"), para texto da
// API ou número.
export function formatarMoeda(valor: Valor): string {
  return MOEDA.format(paraCentavos(valor) / 100)
}

// CONTRATO-18: eixos de gráfico com valores grandes ("R$ 1,2 mil").
export function formatarMoedaCompacta(valor: Valor): string {
  return MOEDA_COMPACTA.format(paraCentavos(valor) / 100)
}
