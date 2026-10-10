import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { PlanoDoSalario } from "@/types/salario"

import { usuario } from "../permissoes/acesso"
import { CATEGORIAS_DE_RECEITA, CONTAS, METAS, MODELOS, PLANO_SALVO, SEM_PLANO, parte, referencias, resposta } from "./dados"

// O plano salvo aparece como uma barra de 100% com a legenda das partes e o
// livre; "Editar plano" abre o editor no mesmo lugar, "Cancelar" volta ao
// plano salvo, e "Trocar de modelo" pede confirmação quando há mudanças.

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() })

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/salario",
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const put = vi.mocked(api.put)

function comPlano(plano: PlanoDoSalario) {
  const dados: Record<string, unknown> = {
    "/salary/pending/": [],
    "/salary/references/": referencias(),
    "/salary/plan/": plano,
    "/salary/models/": MODELOS,
    "/accounts/": CONTAS,
    "/goals/": METAS,
    "/categories/": CATEGORIAS_DE_RECEITA,
  }
  get.mockImplementation(((url: string) => resposta(dados[url] ?? [])) as typeof api.get)
}

// 50% na conta do salário, 30% sem destino e R$ 300,00 na Reserva: sobre a
// média de R$ 3.000,00, o fixo é 10% e ficam 10% livres
const PLANO_COM_LIVRE: PlanoDoSalario = {
  has_plan: true,
  parts: [
    parte({ id: "p-ess", name: "Essenciais", value: "50.00", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário", reference: "ESSENCIAL" }),
    parte({ id: "p-gua", name: "Guardar", value: "30.00" }),
    parte({ id: "p-res", name: "Reserva", rule_type: "FIXED", value: "300.00", destination_type: "ACCOUNT", destination_name: "Reserva", account: "conta-reserva" }),
  ],
  salary_categories: ["cat-salario"],
}

const regiaoDoPlano = () => screen.findByRole("region", { name: "Plano de divisão" })
const partes = () => screen.getByRole("list", { name: "Partes do plano" })
const legenda = (nome: string) => within(partes()).getByRole("listitem", { name: nome })
const barra = () => screen.getByRole("img", { name: /^Divisão do salário/ })

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  comPlano(PLANO_SALVO)
  put.mockImplementation(((_url: string, corpo: unknown) => resposta({ ...PLANO_SALVO, ...(corpo as object) })) as typeof api.put)
})

// A página inteira é pesada no jsdom quando a suíte roda em paralelo
describe("Resumo e edição do plano", { timeout: 15000 }, () => {
  it("o cabeçalho diz qual é o plano ativo, ou que ainda não há plano", async () => {
    const { unmount } = render(<SalarioPage />)
    expect(await screen.findByText("Plano ativo: 50/30/20")).toBeInTheDocument()
    unmount()

    comPlano(SEM_PLANO)
    render(<SalarioPage />)
    expect(await screen.findByText("Sem plano ainda")).toBeInTheDocument()
  })

  it("o plano salvo vira uma barra de 100% e a legenda com destino e regra", async () => {
    render(<SalarioPage />)
    await regiaoDoPlano()

    expect(barra()).toHaveAccessibleName("Divisão do salário: Essenciais 50%, Dispensáveis 30%, Guardar 20%")
    expect(legenda("Essenciais")).toHaveTextContent("Fica na conta do salário")
    expect(legenda("Essenciais")).toHaveTextContent("50%")
    expect(legenda("Essenciais")).toHaveTextContent("62,0% no seu histórico")
    expect(legenda("Guardar")).toHaveTextContent("Meta: Viagem")
    expect(legenda("Guardar")).toHaveTextContent("20%")
    // Tudo dividido: não sobra livre
    expect(within(partes()).queryByRole("listitem", { name: "Livre" })).not.toBeInTheDocument()
    // Fora da edição, nenhum campo das partes
    expect(screen.queryByLabelText("Percentual de Guardar")).not.toBeInTheDocument()
  })

  it("o que não vai para nenhuma parte aparece como Livre, e a parte sem destino é avisada", async () => {
    comPlano(PLANO_COM_LIVRE)
    render(<SalarioPage />)
    await regiaoDoPlano()

    expect(barra()).toHaveAccessibleName("Divisão do salário: Essenciais 50%, Guardar 30%, Reserva 10%, Livre 10%")
    expect(legenda("Livre")).toHaveTextContent("10%")
    expect(legenda("Guardar")).toHaveTextContent("Sem destino")
    expect(legenda("Reserva")).toHaveTextContent("R$ 300,00")
    expect(screen.getByText("Plano ativo: 3 partes")).toBeInTheDocument()
  })

  it("editar muda a barra na hora, e Cancelar volta ao plano salvo sem gravar", async () => {
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Editar plano" }))

    const percentual = screen.getByLabelText("Percentual de Guardar")
    await userEvent.clear(percentual)
    await userEvent.type(percentual, "10")
    expect(barra()).toHaveAccessibleName("Divisão do salário: Essenciais 50%, Dispensáveis 30%, Guardar 10%, Livre 10%")
    expect(screen.getByText("Soma: 90% · Livre: 10%")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(screen.queryByLabelText("Percentual de Guardar")).not.toBeInTheDocument()
    expect(legenda("Guardar")).toHaveTextContent("20%")
    expect(barra()).toHaveAccessibleName("Divisão do salário: Essenciais 50%, Dispensáveis 30%, Guardar 20%")
    await userEvent.click(screen.getByRole("button", { name: "Editar plano" }))
    expect(screen.getByLabelText("Percentual de Guardar")).toHaveValue("20")
    expect(put).not.toHaveBeenCalled()
  })

  it("a soma acima de 100% fica em vermelho", async () => {
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Editar plano" }))

    const percentual = screen.getByLabelText("Percentual de Guardar")
    await userEvent.clear(percentual)
    await userEvent.type(percentual, "60")

    expect(screen.getByText("Soma: 140% · Passa de 100%")).toHaveClass("text-destructive")
  })

  it("trocar de modelo sem mudanças vai direto à escolha", async () => {
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Editar plano" }))

    await userEvent.click(screen.getByRole("button", { name: "Trocar de modelo" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Escolha do modelo" })).toBeInTheDocument()
  })

  it("trocar de modelo com mudanças pede confirmação antes de descartar", async () => {
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Editar plano" }))
    await userEvent.clear(screen.getByLabelText("Nome da parte 3"))
    await userEvent.type(screen.getByLabelText("Nome da parte 3"), "Viagem")

    await userEvent.click(screen.getByRole("button", { name: "Trocar de modelo" }))
    let confirmacao = await screen.findByRole("alertdialog")
    expect(within(confirmacao).getByRole("heading", { name: "Trocar de modelo?" })).toBeInTheDocument()
    await userEvent.click(within(confirmacao).getByRole("button", { name: "Continuar editando" }))

    await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(screen.getByLabelText("Nome da parte 3")).toHaveValue("Viagem")

    await userEvent.click(screen.getByRole("button", { name: "Trocar de modelo" }))
    confirmacao = await screen.findByRole("alertdialog")
    await userEvent.click(within(confirmacao).getByRole("button", { name: "Trocar de modelo" }))

    expect(await screen.findByRole("region", { name: "Escolha do modelo" })).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })
})
