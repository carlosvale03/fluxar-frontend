import { afterEach, describe, expect, it } from "vitest"

import { DEFAULT_CONFIG, getInitialConfig } from "@/components/dashboard/dashboard-customizer"

// CLASSE-28: o layout salvo antes da feature não tem CLASS_DISTRIBUTION. A
// mescla precisa manter a ordem e a visibilidade salvas, não perder nem
// repetir módulo e pôr o gráfico por classe logo depois da distribuição de
// despesas.

const CHAVE = "dashboard_layout_config"

const salvar = (layout: { id: string; visible: boolean }[]) =>
  localStorage.setItem(CHAVE, JSON.stringify(layout))

const ids = () => getInitialConfig().map(m => m.id)

describe("arrumação salva do dashboard", () => {
  afterEach(() => localStorage.clear())

  it("encaixa o módulo de classes num layout antigo sem perder a ordem nem a visibilidade", () => {
    salvar([
      { id: "GOALS_JOURNEY", visible: true },
      { id: "EXPENSE_DISTRIBUTION", visible: true },
      { id: "DAILY_CASH_FLOW", visible: false },
      { id: "MONTHLY_BALANCE", visible: true },
      { id: "BALANCE_EVOLUTION", visible: true },
      { id: "BUDGET_SUMMARY", visible: false },
      { id: "INCOME_SOURCE", visible: true },
      { id: "TAG_EXPENSE_DISTRIBUTION", visible: true },
      { id: "TAG_INCOME_SOURCE", visible: false },
      { id: "CREDIT_MANAGEMENT", visible: true },
    ])

    const config = getInitialConfig()
    const ordem = config.map(m => m.id)

    expect(ordem).toHaveLength(DEFAULT_CONFIG.length)
    expect(new Set(ordem).size).toBe(DEFAULT_CONFIG.length)
    expect([...ordem].sort()).toEqual(DEFAULT_CONFIG.map(m => m.id).sort())
    expect(ordem).toEqual([
      "GOALS_JOURNEY",
      "EXPENSE_DISTRIBUTION",
      "CLASS_DISTRIBUTION",
      "DAILY_CASH_FLOW",
      "MONTHLY_BALANCE",
      "BALANCE_EVOLUTION",
      "BUDGET_SUMMARY",
      "INCOME_SOURCE",
      "TAG_EXPENSE_DISTRIBUTION",
      "TAG_INCOME_SOURCE",
      "CREDIT_MANAGEMENT",
    ])

    const visivel = (id: string) => config.find(m => m.id === id)?.visible
    expect(visivel("DAILY_CASH_FLOW")).toBe(false)
    expect(visivel("BUDGET_SUMMARY")).toBe(false)
    expect(visivel("TAG_INCOME_SOURCE")).toBe(false)
    expect(visivel("TAG_EXPENSE_DISTRIBUTION")).toBe(true)
    expect(visivel("CLASS_DISTRIBUTION")).toBe(true)
  })

  it("põe no começo o módulo que falta quando ele é o primeiro do padrão", () => {
    salvar(
      DEFAULT_CONFIG.filter(m => m.id !== "DAILY_CASH_FLOW")
        .reverse()
        .map(m => ({ id: m.id, visible: true })),
    )

    const ordem = ids()

    expect(ordem[0]).toBe("DAILY_CASH_FLOW")
    expect(ordem).toHaveLength(DEFAULT_CONFIG.length)
    expect(new Set(ordem).size).toBe(DEFAULT_CONFIG.length)
  })

  it("sem layout salvo usa o padrão", () => {
    expect(ids()).toEqual(DEFAULT_CONFIG.map(m => m.id))
  })
})
