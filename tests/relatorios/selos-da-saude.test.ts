import { describe, expect, it } from "vitest"

import { seloDaReserva, seloDoPoderDeAporte } from "@/lib/saude-financeira"

// P-16: os selos das Cartas avançadas dependem dos números
describe("seloDoPoderDeAporte", () => {
  it("separa saudável, atenção e baixo pelos limites de 20% e 10%", () => {
    expect(seloDoPoderDeAporte(20)).toEqual({ rotulo: "Saudável", variante: "success" })
    expect(seloDoPoderDeAporte(19.9)).toEqual({ rotulo: "Atenção", variante: "warning" })
    expect(seloDoPoderDeAporte(10)).toEqual({ rotulo: "Atenção", variante: "warning" })
    expect(seloDoPoderDeAporte(-5)).toEqual({ rotulo: "Baixo", variante: "destructive" })
  })

  it("sem taxa (mês sem entradas), não mostra selo", () => {
    expect(seloDoPoderDeAporte(null)).toBeNull()
    expect(seloDoPoderDeAporte(undefined)).toBeNull()
    expect(seloDoPoderDeAporte(Number.NaN)).toBeNull()
  })
})

describe("seloDaReserva", () => {
  it("separa completa, parcial e baixa pelos limites de 6 e 3 meses", () => {
    expect(seloDaReserva(6)).toEqual({ rotulo: "Reserva completa", variante: "success" })
    expect(seloDaReserva(3)).toEqual({ rotulo: "Reserva parcial", variante: "warning" })
    expect(seloDaReserva(2.9)).toEqual({ rotulo: "Reserva baixa", variante: "destructive" })
  })

  it("sem dado, não mostra selo", () => {
    expect(seloDaReserva(null)).toBeNull()
  })
})
