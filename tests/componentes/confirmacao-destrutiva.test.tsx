import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ConfirmacaoDestrutiva } from "@/components/ui/confirmacao-destrutiva"

function Exemplo({ onConfirmar }: { onConfirmar: () => Promise<void> }) {
  const [aberta, setAberta] = useState(true)
  return (
    <ConfirmacaoDestrutiva
      aberta={aberta}
      onAbertaChange={setAberta}
      titulo="Excluir o cartão Azul?"
      descricao="As 4 faturas e os 38 lançamentos deste cartão serão excluídos."
      rotuloConfirmar="Excluir cartão"
      onConfirmar={onConfirmar}
    />
  )
}

// AZ-15: a confirmação diz o impacto e o botão repete o verbo
describe("ConfirmacaoDestrutiva", () => {
  it("mostra o título, o impacto e fecha depois de confirmar", async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined)
    render(<Exemplo onConfirmar={onConfirmar} />)

    expect(screen.getByRole("alertdialog", { name: "Excluir o cartão Azul?" })).toBeInTheDocument()
    expect(screen.getByText(/38 lançamentos/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Excluir cartão" }))

    expect(onConfirmar).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("se a exclusão falhar, o diálogo continua aberto", async () => {
    const onConfirmar = vi.fn().mockRejectedValue(new Error("falhou"))
    render(<Exemplo onConfirmar={onConfirmar} />)

    await userEvent.click(screen.getByRole("button", { name: "Excluir cartão" }))

    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("cancelar fecha sem confirmar", async () => {
    const onConfirmar = vi.fn()
    render(<Exemplo onConfirmar={onConfirmar} />)

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(onConfirmar).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
