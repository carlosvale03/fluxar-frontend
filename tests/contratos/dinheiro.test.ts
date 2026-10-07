import { describe, expect, it } from "vitest"

import { deCentavos, formatarMoeda, formatarMoedaCompacta, lerValorDigitado, paraCentavos } from "@/lib/dinheiro"
import { formatCurrency } from "@/lib/utils"

// CONTRATO-17 a CONTRATO-19 (AD-009, AD-041): leitura, conta e formatação de
// dinheiro num lugar só.

describe("Leitura do valor digitado (AD-009)", () => {
  it.each([
    ["1.500", "1500.00"],
    ["12,5", "12.50"],
    ["0.50", "0.50"],
    ["12.5", "12.50"],
    ["1.234,56", "1234.56"],
  ])("lê %s como %s", (texto, esperado) => {
    expect(lerValorDigitado(texto)).toBe(esperado)
  })

  it("lê o milhar com mais de um grupo e o valor sem separador", () => {
    expect(lerValorDigitado("1.234.567")).toBe("1234567.00")
    expect(lerValorDigitado("100")).toBe("100.00")
  })

  it("lê de volta o valor já formatado em reais", () => {
    expect(lerValorDigitado("R$ 1.500,00")).toBe("1500.00")
  })

  it("recusa texto que não é valor e decimal com mais de duas casas", () => {
    expect(lerValorDigitado("abc")).toBeNull()
    expect(lerValorDigitado("")).toBeNull()
    expect(lerValorDigitado("0.505")).toBeNull()
    expect(lerValorDigitado("1,2,3")).toBeNull()
  })

  it('aceita "-50,00" só com negativo (CONTRATO-20)', () => {
    expect(lerValorDigitado("-50,00")).toBeNull()
    expect(lerValorDigitado("-50,00", { negativo: true })).toBe("-50.00")
  })
})

describe("Conta em centavos (CONTRATO-17)", () => {
  it('somar "0.10" e "0.20" em centavos dá "0.30"', () => {
    // Em ponto flutuante, 0.1 + 0.2 dá 0.30000000000000004
    expect(deCentavos(paraCentavos("0.10") + paraCentavos("0.20"))).toBe("0.30")
  })

  it("converte texto da API e número para centavos inteiros", () => {
    expect(paraCentavos("1234.56")).toBe(123456)
    expect(paraCentavos("-50.00")).toBe(-5000)
    expect(paraCentavos(19.9)).toBe(1990)
    expect(paraCentavos("1234.565")).toBe(123457)
  })

  it("devolve o texto da API com duas casas, inclusive negativo e zero", () => {
    expect(deCentavos(123456)).toBe("1234.56")
    expect(deCentavos(-5)).toBe("-0.05")
    expect(deCentavos(0)).toBe("0.00")
  })
})

describe("Formatador único em reais (CONTRATO-18)", () => {
  it('formatarMoeda("1234.56") dá "R$ 1.234,56" e aceita número', () => {
    expect(formatarMoeda("1234.56")).toBe("R$ 1.234,56")
    expect(formatarMoeda(1234.56)).toBe("R$ 1.234,56")
    expect(formatarMoeda("800")).toBe("R$ 800,00")
  })

  it("formatCurrency de utils é o mesmo formatador", () => {
    expect(formatCurrency).toBe(formatarMoeda)
  })

  it('formatarMoedaCompacta mostra "R$ 1,2 mil" para eixos', () => {
    expect(formatarMoedaCompacta("1200.00")).toBe("R$ 1,2 mil")
  })
})
