import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SpareChangeBank } from "@/components/goals/SpareChangeBank"
import { api } from "@/services/apiClient"
import { goalsService } from "@/services/goals"
import { ConfiguracaoDeTrocos } from "@/types/goals"

import { meta } from "./dados"

// META-35, META-37, META-43 a META-45: o cofrinho de trocos usa as rotas de
// trocos do backend. A tela mostra o total e a quantidade pendentes, ativa,
// escolhe a meta, desativa, deposita e mostra os descartados e a pausa, sem
// buscar transações nem calcular troco no navegador.

vi.mock("@/services/goals", () => ({
  goalsService: { getSpareChange: vi.fn(), updateSpareChange: vi.fn(), depositSpareChange: vi.fn() },
}))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const METAS = [meta({ id: "1", name: "Viagem" }), meta({ id: "2", name: "Reserva" })]

function configuracao(trocas: Partial<ConfiguracaoDeTrocos> = {}): ConfiguracaoDeTrocos {
  return { active: true, goal: 1, paused: false, pending_total: "1.10", pending_count: 2, ...trocas }
}

async function escolherMeta(nome: RegExp) {
  await userEvent.click(screen.getByRole("combobox"))
  await userEvent.click(await screen.findByRole("option", { name: nome }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Cofrinho de trocos", () => {
  it("mostra o total e a quantidade pendentes da API, sem buscar transações", async () => {
    vi.mocked(goalsService.getSpareChange).mockResolvedValue(configuracao())
    render(<SpareChangeBank goals={METAS} onSuccess={vi.fn()} />)

    expect(await screen.findByLabelText("Total pendente")).toHaveTextContent(/^R\$\s1,10$/)
    expect(screen.getByText("Juntando o troco de 2 despesas.")).toBeInTheDocument()
    expect(screen.getByText(/indo para viagem/i)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })

  it("depositar chama a rota e mostra os aportes e os trocos descartados", async () => {
    vi.mocked(goalsService.getSpareChange)
      .mockResolvedValueOnce(configuracao())
      .mockResolvedValueOnce(configuracao({ pending_total: "0.00", pending_count: 0 }))
    vi.mocked(goalsService.depositSpareChange).mockResolvedValue({
      deposits: [{ account_id: "conta-a", amount: "0.70" }, { account_id: "conta-b", amount: "0.40" }],
      discarded: 1,
    })
    const onSuccess = vi.fn()
    render(<SpareChangeBank goals={METAS} onSuccess={onSuccess} />)

    await userEvent.click(await screen.findByRole("button", { name: /depositar trocos/i }))

    expect(await screen.findByText(/^Aporte de R\$\s0,70$/)).toBeInTheDocument()
    expect(screen.getByText(/^Aporte de R\$\s0,40$/)).toBeInTheDocument()
    expect(screen.getByText("1 troco de conta excluída foi descartado.")).toBeInTheDocument()
    expect(goalsService.depositSpareChange).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(await screen.findByLabelText("Total pendente")).toHaveTextContent(/^R\$\s0,00$/)
  })

  it("sem trocos pendentes, o depósito fica desabilitado", async () => {
    vi.mocked(goalsService.getSpareChange).mockResolvedValue(configuracao({ pending_total: "0.00", pending_count: 0 }))
    render(<SpareChangeBank goals={METAS} onSuccess={vi.fn()} />)

    expect(await screen.findByRole("button", { name: /depositar trocos/i })).toBeDisabled()
  })

  it("pausado, pede outra meta e salva a escolhida", async () => {
    vi.mocked(goalsService.getSpareChange).mockResolvedValue(configuracao({ goal: null, paused: true }))
    vi.mocked(goalsService.updateSpareChange).mockResolvedValue(configuracao({ goal: 2 }))
    render(<SpareChangeBank goals={METAS} onSuccess={vi.fn()} />)

    expect(
      await screen.findByText("A meta dos trocos foi arquivada ou excluída. Escolha outra meta para voltar a juntar os trocos."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /depositar trocos/i })).toBeDisabled()

    await escolherMeta(/reserva/i)
    await userEvent.click(screen.getByRole("button", { name: /usar esta meta/i }))

    await vi.waitFor(() => expect(goalsService.updateSpareChange).toHaveBeenCalledWith({ active: true, goal: "2" }))
    expect(await screen.findByText(/indo para reserva/i)).toBeInTheDocument()
    expect(screen.queryByText(/foi arquivada ou excluída/)).not.toBeInTheDocument()
  })

  it("desativar mantém o total pendente disponível para depósito", async () => {
    vi.mocked(goalsService.getSpareChange).mockResolvedValue(configuracao())
    vi.mocked(goalsService.updateSpareChange).mockResolvedValue(configuracao({ active: false }))
    render(<SpareChangeBank goals={METAS} onSuccess={vi.fn()} />)

    await userEvent.click(await screen.findByRole("button", { name: /^desativar$/i }))

    await vi.waitFor(() => expect(goalsService.updateSpareChange).toHaveBeenCalledWith({ active: false }))
    expect(await screen.findByText(/desativado/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Total pendente")).toHaveTextContent(/^R\$\s1,10$/)
    expect(screen.getByRole("button", { name: /depositar trocos/i })).toBeEnabled()
  })

  it("ativar envia a meta escolhida", async () => {
    vi.mocked(goalsService.getSpareChange).mockResolvedValue(
      configuracao({ active: false, goal: null, pending_total: "0.00", pending_count: 0 }),
    )
    vi.mocked(goalsService.updateSpareChange).mockResolvedValue(configuracao({ pending_total: "0.00", pending_count: 0 }))
    render(<SpareChangeBank goals={METAS} onSuccess={vi.fn()} />)

    await screen.findByText(/desativado/i)
    await escolherMeta(/viagem/i)
    await userEvent.click(screen.getByRole("button", { name: /ativar trocos/i }))

    await vi.waitFor(() => expect(goalsService.updateSpareChange).toHaveBeenCalledWith({ active: true, goal: "1" }))
    expect(await screen.findByText(/indo para viagem/i)).toBeInTheDocument()
  })
})
