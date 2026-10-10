import { deCentavos, paraCentavos } from "@/lib/dinheiro"
import type { ModeloDeDivisao, ReferenciaDaParte, ReferenciasDoSalario, RegraDaParte } from "@/types/salario"

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

// O nome do modelo quando o plano salvo tem exatamente as partes dele, para o
// status da página ("Plano ativo: 50/30/20"); senão, null
export function modeloDoPlano(
  partes: { name: string; rule_type: RegraDaParte; value: string }[],
  modelos: ModeloDeDivisao[] | null | undefined,
): string | null {
  if (!modelos || partes.length === 0) return null
  const modelo = modelos.find(
    (m) =>
      m.parts.length === partes.length &&
      m.parts.every(
        (p, i) =>
          p.name === partes[i].name && p.rule_type === partes[i].rule_type && paraCentavos(p.value) === paraCentavos(partes[i].value),
      ),
  )
  return modelo?.name ?? null
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
}

export interface BarraDaDivisao {
  fatias: FatiaDaBarra[]
  // O que não vai para nenhuma parte, em centésimos de ponto percentual
  livre: number
  // Soma dos percentuais digitados, sem o limite de 100%
  somaDosPercentuais: number
  // Soma das partes em valor fixo, em centavos
  somaDosFixos: number
  // Partes em valor fixo que ficaram fora por falta de um salário de base
  fixasForaDaBarra: number
}

// A proporção de cada parte num salário de 100%. Percentuais entram como
// estão; valores fixos, sobre a base em centavos (sem base, ficam fora). As
// partes são atendidas na ordem, então a que passa de 100% é cortada, como
// na divisão de verdade.
export function montarBarra(partes: ParteDaBarra[], baseEmCentavos: number | null): BarraDaDivisao {
  let restante = 10000
  let somaDosPercentuais = 0
  let somaDosFixos = 0
  let fixasForaDaBarra = 0
  const fatias = partes.map((parte, indice) => {
    const valor = paraCentavos(parte.valor)
    const seguro = Number.isNaN(valor) || valor < 0 ? 0 : valor
    let pedido = 0
    if (parte.regra === "PERCENT") {
      pedido = seguro
      somaDosPercentuais += seguro
    } else {
      somaDosFixos += seguro
      if (baseEmCentavos && baseEmCentavos > 0) pedido = Math.round((seguro * 10000) / baseEmCentavos)
      else if (seguro > 0) fixasForaDaBarra += 1
    }
    const centesimos = Math.min(pedido, restante)
    restante -= centesimos
    return { nome: parte.nome, indice, centesimos }
  })
  return { fatias, livre: restante, somaDosPercentuais, somaDosFixos, fixasForaDaBarra }
}

// Centésimos de ponto percentual para o texto ("50%", "33,33%")
export function textoDoPercentual(centesimos: number): string {
  return `${percentualParaCampo(deCentavos(centesimos))}%`
}
