import { deCentavos, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import type { ModeloDeDivisao, ReferenciaDaParte, ReferenciasDoSalario, RegraDaParte, SaidaDescontada } from "@/types/salario"

// SALARIO-56: com menos de 3 meses completos, a tela diz quantos entraram na
// média ("Média de 1 mês", "Média de 2 meses")
export function avisoDosMeses(mesesUsados: number): string | null {
  if (mesesUsados >= 3) return null
  if (mesesUsados <= 0) return "Ainda não há um mês completo de histórico."
  return `Média de ${mesesUsados} ${mesesUsados === 1 ? "mês" : "meses"}`
}

// SALARIO-54: a porcentagem do salário médio que a classe da referência
// ocupou no histórico, com uma casa ("62,0%"). Sem salário no histórico ou
// sem a classe, não há porcentagem.
export function porcentagemNoHistorico(
  referencia: ReferenciaDaParte | null | undefined,
  referencias: ReferenciasDoSalario | null | undefined,
): string | null {
  if (!referencia || !referencias) return null
  const salario = paraCentavos(referencias.history.salary_average)
  if (!(salario > 0)) return null
  const classe = referencias.history.by_class.find((c) => c.reference === referencia)
  if (!classe) return null
  // Em décimos de ponto percentual, em inteiros: 186000 * 1000 / 300000 = 620
  const decimos = Math.round((paraCentavos(classe.average) * 1000) / salario)
  return `${Math.floor(decimos / 10)},${decimos % 10}%`
}

// Percentual da API ("33.33") para o campo ("33,33"), sem zeros à direita
export function percentualParaCampo(valor: string): string {
  const centesimos = paraCentavos(valor)
  if (Number.isNaN(centesimos) || centesimos < 0) return ""
  const fracao = String(centesimos % 100).padStart(2, "0").replace(/0+$/, "")
  return fracao ? `${Math.floor(centesimos / 100)},${fracao}` : String(Math.floor(centesimos / 100))
}

// "N transações" com o singular para uma (SALARIO-31)
export function quantidadeDeTransacoes(n: number): string {
  return `${n} ${n === 1 ? "transação" : "transações"}`
}

// "N saídas" com o singular para uma (SALARIO-71)
export function quantidadeDeSaidas(n: number): string {
  return `${n} ${n === 1 ? "saída" : "saídas"}`
}

// SALARIO-68: "Descontou R$ 130,00 em 1 saída", ou null sem desconto
export function resumoDoDesconto(saidas: SaidaDescontada[] | undefined): string | null {
  if (!saidas?.length) return null
  const total = saidas.reduce((soma, saida) => soma + paraCentavos(saida.amount), 0)
  return `Descontou ${formatarMoeda(deCentavos(total))} em ${quantidadeDeSaidas(saidas.length)}`
}

// O modelo que tem exatamente as partes do plano, ou null: dá o nome do
// status da página ("Plano ativo: 50/30/20") e o sentido das partes
export function modeloCorrespondente(
  partes: { name: string; rule_type: RegraDaParte; value: string }[],
  modelos: ModeloDeDivisao[] | null | undefined,
): ModeloDeDivisao | null {
  if (!modelos || partes.length === 0) return null
  return (
    modelos.find(
      (m) =>
        m.parts.length === partes.length &&
        m.parts.every(
          (p, i) =>
            p.name === partes[i].name && p.rule_type === partes[i].rule_type && paraCentavos(p.value) === paraCentavos(partes[i].value),
        ),
    ) ?? null
  )
}

// Uma parte para a barra da divisão: o valor é o texto da API ("50.00"), ou
// null quando o campo ainda não tem um valor
export interface ParteDaBarra {
  nome: string
  regra: RegraDaParte
  valor: string | null
}

export interface FatiaDaBarra {
  nome: string
  // Posição da parte na lista, que escolhe a cor
  indice: number
  // Em centésimos de ponto percentual: 5000 = 50%
  centesimos: number
  // Quanto a parte recebe da base, em centavos; null sem base
  centavos: number | null
  // A parte fixa foi reduzida porque os fixos passaram da base
  reduzida: boolean
}

export interface BarraDaDivisao {
  fatias: FatiaDaBarra[]
  // O que não vai para nenhuma parte, em centésimos de ponto percentual
  livre: number
  // O livre em centavos; null sem base
  livreEmCentavos: number | null
  // Soma dos percentuais digitados, sem o limite de 100%
  somaDosPercentuais: number
  // Soma das partes em valor fixo, em centavos
  somaDosFixos: number
  // Partes em valor fixo que ficaram fora por falta de um salário de base
  fixasForaDaBarra: number
}

export interface DivisaoCalculada {
  // Quanto cada parte recebe, em centavos, na ordem das partes
  valores: number[]
  // Partes fixas reduzidas porque os fixos passaram da base
  reduzidas: boolean[]
  // O que sobra depois dos fixos, base dos percentuais
  restante: number
  // O que fica livre na conta do salário
  livre: number
}

const valorSeguro = (valor: string | null) => {
  const centavos = paraCentavos(valor)
  return Number.isNaN(centavos) || centavos < 0 ? 0 : centavos
}

// SALARIO-26 a SALARIO-28 (AD-056), a mesma regra do backend: os valores
// fixos saem primeiro da base; se passarem dela, a última parte fixa é
// reduzida até zero, depois a anterior. Os percentuais valem sobre o que
// sobra, cada um arredondado para baixo no centavo, atendidos na ordem.
export function calcularDivisao(partes: ParteDaBarra[], baseEmCentavos: number): DivisaoCalculada {
  const base = Math.max(0, baseEmCentavos)
  const valores = partes.map((parte) => (parte.regra === "FIXED" ? valorSeguro(parte.valor) : 0))
  const reduzidas = partes.map(() => false)

  let excesso = valores.reduce((soma, valor) => soma + valor, 0) - base
  for (let i = partes.length - 1; i >= 0 && excesso > 0; i--) {
    if (partes[i].regra !== "FIXED" || valores[i] === 0) continue
    const corte = Math.min(valores[i], excesso)
    valores[i] -= corte
    reduzidas[i] = true
    excesso -= corte
  }

  const restante = Math.max(0, base - valores.reduce((soma, valor) => soma + valor, 0))
  let disponivel = restante
  partes.forEach((parte, i) => {
    if (parte.regra !== "PERCENT") return
    const pedido = Math.floor((restante * valorSeguro(parte.valor)) / 10000)
    valores[i] = Math.min(pedido, disponivel)
    disponivel -= valores[i]
  })

  return { valores, reduzidas, restante, livre: base - valores.reduce((soma, valor) => soma + valor, 0) }
}

// A proporção de cada parte num salário de 100%. Com uma base em centavos, a
// barra mostra a divisão de calcularDivisao; sem base, os percentuais entram
// como estão, atendidos na ordem até 100%, e os valores fixos ficam fora.
export function montarBarra(partes: ParteDaBarra[], baseEmCentavos: number | null): BarraDaDivisao {
  let somaDosPercentuais = 0
  let somaDosFixos = 0
  for (const parte of partes) {
    if (parte.regra === "PERCENT") somaDosPercentuais += valorSeguro(parte.valor)
    else somaDosFixos += valorSeguro(parte.valor)
  }

  let restante = 10000
  if (baseEmCentavos && baseEmCentavos > 0) {
    const divisao = calcularDivisao(partes, baseEmCentavos)
    const fatias = partes.map((parte, indice) => {
      const centavos = divisao.valores[indice]
      const centesimos = Math.min(Math.round((centavos * 10000) / baseEmCentavos), restante)
      restante -= centesimos
      return { nome: parte.nome, indice, centesimos, centavos, reduzida: divisao.reduzidas[indice] }
    })
    return { fatias, livre: restante, livreEmCentavos: divisao.livre, somaDosPercentuais, somaDosFixos, fixasForaDaBarra: 0 }
  }

  let fixasForaDaBarra = 0
  const fatias = partes.map((parte, indice) => {
    let centesimos = 0
    if (parte.regra === "PERCENT") centesimos = Math.min(valorSeguro(parte.valor), restante)
    else if (valorSeguro(parte.valor) > 0) fixasForaDaBarra += 1
    restante -= centesimos
    return { nome: parte.nome, indice, centesimos, centavos: null, reduzida: false }
  })
  return { fatias, livre: restante, livreEmCentavos: null, somaDosPercentuais, somaDosFixos, fixasForaDaBarra }
}

// SALARIO-58: reparte um total, em centésimos de ponto percentual, entre as
// partes na proporção dos valores atuais de cada uma (todas zeradas, em partes
// iguais). Cada parte fica com duas casas, arredondada para baixo, e a sobra
// do arredondamento vai para a maior, para a soma dar o total exato. Total
// negativo vira zero.
export function repartirPercentual(atuais: number[], total: number): number[] {
  if (atuais.length === 0) return []
  const alvo = Math.max(0, Math.round(total))
  const pesos = atuais.map((valor) => Math.max(0, valor))
  const soma = pesos.reduce((s, p) => s + p, 0)
  const novos = pesos.map((peso) => (soma > 0 ? Math.floor((alvo * peso) / soma) : Math.floor(alvo / pesos.length)))
  const sobra = alvo - novos.reduce((s, v) => s + v, 0)
  const maior = novos.reduce((indiceDoMaior, valor, i) => (valor > novos[indiceDoMaior] ? i : indiceDoMaior), 0)
  novos[maior] += sobra
  return novos
}

export type OrigemDaBase = "simulado" | "recebido" | "media"

// SALARIO-63: a base das prévias é o valor da simulação, quando preenchido;
// senão, o salário recebido mais recente; senão, a média do histórico
export function baseDaPrevia(
  simulado: string | null | undefined,
  recebido: string | null | undefined,
  media: string | null | undefined,
): { centavos: number; origem: OrigemDaBase } | null {
  const candidatos: [string | null | undefined, OrigemDaBase][] = [
    [simulado, "simulado"],
    [recebido, "recebido"],
    [media, "media"],
  ]
  for (const [valor, origem] of candidatos) {
    const centavos = paraCentavos(valor ?? "")
    if (centavos > 0) return { centavos, origem }
  }
  return null
}

// O texto da base das prévias: "Com o salário de R$ 3.000,00", ou "Com a
// média do seu salário (R$ 3.000,00)"
export function textoDaBase(base: { centavos: number; origem: OrigemDaBase }): string {
  const valor = formatarMoeda(deCentavos(base.centavos))
  return base.origem === "media" ? `Com a média do seu salário (${valor})` : `Com o salário de ${valor}`
}

// Centésimos de ponto percentual para o texto ("50%", "33,33%")
export function textoDoPercentual(centesimos: number): string {
  return `${percentualParaCampo(deCentavos(centesimos))}%`
}
