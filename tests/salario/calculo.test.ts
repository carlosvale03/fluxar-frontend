import { describe, expect, it } from "vitest"

import { baseDaPrevia, calcularDivisao, montarBarra, textoDaBase, type ParteDaBarra } from "@/lib/salario"

// SALARIO-26 a SALARIO-28 e SALARIO-63 (AD-056): as prévias seguem a regra do
// backend, com os valores fixos antes e os percentuais sobre o que sobra

const fixa = (nome: string, valor: string): ParteDaBarra => ({ nome, regra: "FIXED", valor })
const percentual = (nome: string, valor: string): ParteDaBarra => ({ nome, regra: "PERCENT", valor })

describe("calcularDivisao", () => {
  it("R$ 3.000,00 com R$ 500,00 fixos e 50/30/20 divide R$ 2.500,00 nos percentuais, sem livre", () => {
    const divisao = calcularDivisao(
      [fixa("Aluguel", "500.00"), percentual("Essenciais", "50.00"), percentual("Dispensáveis", "30.00"), percentual("Guardar", "20.00")],
      300000,
    )

    expect(divisao.valores).toEqual([50000, 125000, 75000, 50000])
    expect(divisao.restante).toBe(250000)
    expect(divisao.livre).toBe(0)
    expect(divisao.reduzidas).toEqual([false, false, false, false])
  })

  it("fixos de R$ 700,00 e R$ 500,00 sobre R$ 1.000,00 reduzem a última fixa e zeram os percentuais", () => {
    const divisao = calcularDivisao([fixa("Aluguel", "700.00"), fixa("Escola", "500.00"), percentual("Guardar", "10.00")], 100000)

    expect(divisao.valores).toEqual([70000, 30000, 0])
    expect(divisao.reduzidas).toEqual([false, true, false])
    expect(divisao.livre).toBe(0)
  })

  it("a redução passa para a fixa anterior quando a última chega a zero", () => {
    const divisao = calcularDivisao([fixa("A", "800.00"), fixa("B", "300.00")], 50000)

    expect(divisao.valores).toEqual([50000, 0])
    expect(divisao.reduzidas).toEqual([true, true])
  })

  it("33,33% depois de R$ 100,00 fixos sobre R$ 1.100,00 vale R$ 333,30, e a diferença fica livre", () => {
    const divisao = calcularDivisao([fixa("Conta", "100.00"), percentual("Guardar", "33.33")], 110000)

    expect(divisao.valores).toEqual([10000, 33330])
    expect(divisao.livre).toBe(66670)
  })

  it("percentuais que passam de 100% são atendidos na ordem até acabar o que sobra", () => {
    const divisao = calcularDivisao([percentual("A", "80.00"), percentual("B", "40.00")], 100000)

    expect(divisao.valores).toEqual([80000, 20000])
    expect(divisao.livre).toBe(0)
  })
})

describe("montarBarra", () => {
  it("com base, a barra e os valores seguem calcularDivisao", () => {
    const barra = montarBarra(
      [percentual("Essenciais", "50.00"), percentual("Guardar", "30.00"), fixa("Reserva", "300.00")],
      300000,
    )

    // R$ 2.700,00 para os percentuais: R$ 1.350,00 e R$ 810,00, e R$ 540,00 livres
    expect(barra.fatias.map((f) => [f.centesimos, f.centavos])).toEqual([
      [4500, 135000],
      [2700, 81000],
      [1000, 30000],
    ])
    expect(barra.livre).toBe(1800)
    expect(barra.livreEmCentavos).toBe(54000)
    expect(barra.somaDosPercentuais).toBe(8000)
    expect(barra.somaDosFixos).toBe(30000)
  })

  it("sem base, os percentuais entram como estão e os fixos ficam fora", () => {
    const barra = montarBarra([percentual("Guardar", "10.00"), fixa("Reserva", "300.00")], null)

    expect(barra.fatias.map((f) => f.centesimos)).toEqual([1000, 0])
    expect(barra.fatias[0].centavos).toBeNull()
    expect(barra.livre).toBe(9000)
    expect(barra.livreEmCentavos).toBeNull()
    expect(barra.fixasForaDaBarra).toBe(1)
  })
})

describe("baseDaPrevia", () => {
  it("usa o valor simulado, depois o salário recebido, depois a média", () => {
    expect(baseDaPrevia("4200.00", "3000.00", "2500.00")).toEqual({ centavos: 420000, origem: "simulado" })
    expect(baseDaPrevia("", "3000.00", "2500.00")).toEqual({ centavos: 300000, origem: "recebido" })
    expect(baseDaPrevia("", undefined, "2500.00")).toEqual({ centavos: 250000, origem: "media" })
    expect(baseDaPrevia("", undefined, "0.00")).toBeNull()
  })

  it("diz de onde vem a base", () => {
    // O formatador põe um espaço sem quebra depois do R$
    const texto = (t: string) => t.replace(/\s/g, " ")
    expect(texto(textoDaBase({ centavos: 300000, origem: "recebido" }))).toBe("Com o salário de R$ 3.000,00")
    expect(texto(textoDaBase({ centavos: 250000, origem: "media" }))).toBe("Com a média do seu salário (R$ 2.500,00)")
  })
})
