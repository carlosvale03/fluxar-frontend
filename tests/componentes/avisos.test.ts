import { describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

import { avisarComDesfazer, DURACAO_DO_DESFAZER } from "@/lib/avisos"

vi.mock("sonner", () => ({ toast: vi.fn() }))

// AZ-19 e D-10: a exclusão simples avisa com Desfazer por 5 segundos
describe("avisarComDesfazer", () => {
  it("mostra a mensagem com o botão Desfazer que chama a restauração", () => {
    const desfazer = vi.fn()
    avisarComDesfazer("Lançamento excluído.", desfazer)

    const [mensagem, opcoes] = vi.mocked(toast).mock.calls[0] as unknown as [
      string,
      { duration: number; action: { label: string; onClick: () => void } },
    ]
    expect(mensagem).toBe("Lançamento excluído.")
    expect(opcoes.duration).toBe(DURACAO_DO_DESFAZER)
    expect(opcoes.action.label).toBe("Desfazer")

    opcoes.action.onClick()
    expect(desfazer).toHaveBeenCalledTimes(1)
  })
})
