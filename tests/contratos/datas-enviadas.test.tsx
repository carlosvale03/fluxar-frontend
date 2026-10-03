import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { GoalDepositForm } from "@/components/goals/GoalDepositForm"
import { GoalForm } from "@/components/goals/GoalForm"
import { GoalWithdrawForm } from "@/components/goals/GoalWithdrawForm"
import { accountsService } from "@/services/accounts"
import { api } from "@/services/apiClient"
import { goalsService } from "@/services/goals"
import { importExportService } from "@/services/import-export"
import { Account, AccountType } from "@/types/accounts"
import { Goal } from "@/types/goals"

// CONTRATO-24 e CONTRATO-25: datas sem hora vão à API como AAAA-MM-DD, no
// mesmo dia que o usuário vê, no fuso de Brasília e no de Lisboa. A
// exportação manda o período e os filtros no formato da API (CONTRATO-12).

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

vi.mock("@/services/accounts", () => ({ accountsService: { getAccounts: vi.fn() } }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const CONTA = {
  id: "conta-1",
  name: "Banco",
  type: AccountType.CHECKING,
  balance: "5000.00",
  initial_balance: "0.00",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as Account

const META = {
  id: "meta-1",
  name: "Viagem",
  target_amount: "10000.00",
  current_amount: "2000.00",
  target_date: "2026-12-31",
  account: "cofrinho-1",
  status: "IN_PROGRESS",
  progress_percentage: 20,
  amount_remaining: "8000.00",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as Goal

async function escolherConta() {
  await userEvent.click(screen.getAllByRole("combobox")[0])
  await userEvent.click(await screen.findByRole("option", { name: /banco/i }))
}

function digitarValor(texto: string) {
  const campo = screen.getByRole("textbox")
  fireEvent.change(campo, { target: { value: texto } })
  fireEvent.blur(campo)
}

describe.each(["America/Sao_Paulo", "Europe/Lisbon"])("Datas enviadas sem hora no fuso %s", (fuso) => {
  beforeAll(() => {
    process.env.TZ = fuso
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(accountsService.getAccounts).mockResolvedValue([CONTA])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('editar só o nome de uma meta com data-alvo 31/12/2026 envia target_date "2026-12-31"', async () => {
    const atualizar = vi.spyOn(goalsService, "updateGoal").mockResolvedValue(META)
    render(<GoalForm open onOpenChange={vi.fn()} onSuccess={vi.fn()} initialData={META} />)

    const nome = await screen.findByDisplayValue("Viagem")
    fireEvent.change(nome, { target: { value: "Viagem ao Japão" } })
    await userEvent.click(screen.getByRole("button", { name: /atualizar objetivo/i }))

    await vi.waitFor(() => expect(atualizar).toHaveBeenCalledTimes(1))
    expect(atualizar.mock.calls[0][1]).toMatchObject({ name: "Viagem ao Japão", target_date: "2026-12-31" })
  })

  it("o serviço de metas grava uma data escolhida às 23h30 no mesmo dia", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: META })
    await goalsService.updateGoal("meta-1", { target_date: new Date(2026, 11, 31, 23, 30) as unknown as string })

    const corpo = vi.mocked(api.patch).mock.calls[0][1] as FormData
    expect(corpo.get("target_date")).toBe("2026-12-31")
  })

  it("exportar setembro envia endDate=2026-09-30, com os filtros repetidos e sem ALL", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: new Blob() })
    await importExportService.exportTransactionsXLS({
      startDate: new Date(2026, 8, 1),
      // endOfMonth: último instante do dia 30, que em UTC já é 1º de outubro no Brasil
      endDate: new Date(2026, 8, 30, 23, 59, 59, 999),
      type: "ALL",
      categoryIds: ["alim", "transp"],
      accountId: "ALL",
      tagIds: ["t1", "t2"],
    })

    const params = (vi.mocked(api.get).mock.calls[0][1] as { params: URLSearchParams }).params
    expect(params.toString()).toBe(
      "startDate=2026-09-01&endDate=2026-09-30&categoryId=alim&categoryId=transp&tagIds=t1&tagIds=t2",
    )
  })

  it("exportar com conta, tipo e uma categoria manda só os filtros escolhidos", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: new Blob() })
    await importExportService.exportTransactionsPDF({
      startDate: undefined,
      endDate: undefined,
      type: "EXPENSE",
      categoryIds: ["alim"],
      accountId: "conta-1",
    })

    const params = (vi.mocked(api.get).mock.calls[0][1] as { params: URLSearchParams }).params
    expect(params.toString()).toBe("type=EXPENSE&categoryId=alim&accountId=conta-1")
  })

  it("aporte e resgate enviam date no dia do usuário, sem datetime", async () => {
    // 23h30 de 3/10 em Brasília; em Lisboa já é 4/10
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-04T02:30:00Z"))
    const hoje = fuso === "America/Sao_Paulo" ? "2026-10-03" : "2026-10-04"
    const aportar = vi.spyOn(goalsService, "deposit").mockResolvedValue({} as never)
    const resgatar = vi.spyOn(goalsService, "withdraw").mockResolvedValue({} as never)

    const { unmount } = render(<GoalDepositForm goal={META} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />)
    await escolherConta()
    digitarValor("100")
    await userEvent.click(screen.getByRole("button", { name: /confirmar aporte/i }))
    await vi.waitFor(() => expect(aportar).toHaveBeenCalledTimes(1))
    unmount()

    render(<GoalWithdrawForm goal={META} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />)
    await escolherConta()
    digitarValor("100")
    await userEvent.click(screen.getByRole("button", { name: /confirmar resgate/i }))
    await vi.waitFor(() => expect(resgatar).toHaveBeenCalledTimes(1))

    for (const corpo of [aportar.mock.calls[0][1], resgatar.mock.calls[0][1]]) {
      expect(corpo).toMatchObject({ date: hoje, amount: "100.00" })
      expect(corpo).not.toHaveProperty("datetime")
    }
  })
})
