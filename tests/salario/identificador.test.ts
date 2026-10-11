import { webcrypto } from "node:crypto"

import { afterEach, describe, expect, it, vi } from "vitest"

import { novoIdentificador } from "@/lib/identificador"

// SALARIO-79: a chave da tentativa sai mesmo onde o crypto.randomUUID não
// existe, como no app aberto por http num IP da rede

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("novoIdentificador", () => {
  it("usa o crypto.randomUUID quando ele existe", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-2222-4333-8444-555555555555" })

    expect(novoIdentificador()).toBe("11111111-2222-4333-8444-555555555555")
  })

  it("fora de contexto seguro, monta um UUID v4 com crypto.getRandomValues", () => {
    vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) })

    const chaves = Array.from({ length: 20 }, novoIdentificador)

    chaves.forEach((chave) => expect(chave).toMatch(UUID))
    expect(new Set(chaves).size).toBe(20)
  })

  it("sem crypto, ainda dá um UUID v4", () => {
    vi.stubGlobal("crypto", undefined)

    expect(novoIdentificador()).toMatch(UUID)
    expect(novoIdentificador()).not.toBe(novoIdentificador())
  })
})
