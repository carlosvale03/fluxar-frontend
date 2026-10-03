import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { MoneyInput } from "@/components/ui/money-input"

// CONTRATO-19 a CONTRATO-21: o campo de dinheiro aceita o valor digitado ou
// colado no formato brasileiro (AD-009) e entrega o texto decimal da API.

function Campo({ inicial = "", permitirNegativo = false, aoMudar = vi.fn() }) {
  const [valor, setValor] = useState(inicial)
  return (
    <MoneyInput
      value={valor}
      permitirNegativo={permitirNegativo}
      onValueChange={(novo) => {
        aoMudar(novo)
        setValor(novo ?? "")
      }}
    />
  )
}

const campo = () => screen.getByRole("textbox") as HTMLInputElement
const ultimo = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0]

describe("Campo de dinheiro em texto", () => {
  it('digitar "1.500" e sair do campo entrega "1500.00" e mostra "R$ 1.500,00"', async () => {
    const aoMudar = vi.fn()
    render(<Campo aoMudar={aoMudar} />)

    await userEvent.type(campo(), "1.500")
    await userEvent.tab()

    expect(ultimo(aoMudar)).toBe("1500.00")
    expect(campo().value).toBe("R$ 1.500,00")
  })

  it('digitar "12,5" entrega "12.50"', async () => {
    const aoMudar = vi.fn()
    render(<Campo aoMudar={aoMudar} />)

    await userEvent.type(campo(), "12,5")
    await userEvent.tab()

    expect(ultimo(aoMudar)).toBe("12.50")
    expect(campo().value).toBe("R$ 12,50")
  })

  it('colar "100" entrega "100.00" (CONTRATO-21)', async () => {
    const aoMudar = vi.fn()
    render(<Campo aoMudar={aoMudar} />)

    await userEvent.click(campo())
    await userEvent.paste("100")

    expect(ultimo(aoMudar)).toBe("100.00")
    expect(campo().value).toBe("R$ 100,00")
  })

  it('com permitirNegativo, "-50,00" entrega "-50.00" (CONTRATO-20)', async () => {
    const aoMudar = vi.fn()
    render(<Campo permitirNegativo aoMudar={aoMudar} />)

    await userEvent.type(campo(), "-50,00")
    await userEvent.tab()

    expect(ultimo(aoMudar)).toBe("-50.00")
    expect(campo().value).toBe("-R$ 50,00")
  })

  it("sem permitirNegativo, o sinal de menos é recusado", async () => {
    const aoMudar = vi.fn()
    render(<Campo aoMudar={aoMudar} />)

    await userEvent.type(campo(), "-50,00")
    await userEvent.tab()

    expect(campo().value).not.toContain("-")
    expect(aoMudar.mock.calls.some(([valor]) => String(valor).startsWith("-"))).toBe(false)
    expect(ultimo(aoMudar)).toBe("50.00")
  })

  it('o valor recebido "1234.56" aparece formatado', () => {
    render(<Campo inicial="1234.56" />)

    expect(campo().value).toBe("R$ 1.234,56")
  })
})
