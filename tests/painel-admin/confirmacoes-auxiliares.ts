import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Passos comuns dos testes das confirmações do painel

export async function abrirLimpeza() {
  await userEvent.click(await screen.findByRole("button", { name: /^limpar dados$/i }))
  return screen.findByRole("dialog")
}

export async function confirmarLimpeza(_email: string, senha: string) {
  const dialogo = screen.getByRole("dialog")
  await userEvent.type(within(dialogo).getByPlaceholderText("Sua senha de acesso admin"), senha)
  await userEvent.click(within(dialogo).getByRole("button", { name: /limpar dados/i }))
}
