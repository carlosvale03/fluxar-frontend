import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import { Header } from "@/components/layout/header"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"

import { usuario } from "../permissoes/acesso"
import { recebimento, referencias, resposta } from "./dados"

// SALARIO-15 e SALARIO-16: a gestão do salário fica no menu e, travada,
// mostra o aviso do plano. SALARIO-24: lista os salários a dividir.
// SALARIO-52, SALARIO-53 e SALARIO-56: comprometido no mês e médias.

const auth = vi.hoisted(() => ({ user: null as User | null }))
const navegacao = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), params: new URLSearchParams() }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn(), logout: vi.fn() })

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navegacao.push, replace: navegacao.replace }),
  usePathname: () => "/salario",
  useSearchParams: () => navegacao.params,
}))
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const get = vi.mocked(api.get)

function comRespostas(dados: Record<string, unknown>) {
  get.mockImplementation(((url: string) => resposta(dados[url] ?? [])) as typeof api.get)
}

beforeEach(() => {
  vi.clearAllMocks()
  navegacao.params = new URLSearchParams()
  auth.user = usuario()
  comRespostas({
    "/salary/pending/": [recebimento(), recebimento({ id: "rec-2", description: "Salário de setembro", amount: "2800.00", date: "2026-09-05", imported: true })],
    "/salary/references/": referencias(),
    "/salary/plan/": { has_plan: false, parts: [], salary_categories: [] },
    "/salary/models/": [],
  })
})

describe("Página da gestão do salário", () => {
  it("o menu de recursos leva à gestão do salário", async () => {
    render(<Header />)

    await userEvent.click(screen.getByRole("button", { name: "Recursos adicionais" }))
    expect(await screen.findByRole("menuitem", { name: /Gestão do salário/ })).toHaveAttribute("href", "/salario")
  })

  it("com o recurso travado, mostra o aviso do plano e não chama as rotas", async () => {
    auth.user = usuario({ fechados: ["gestao_do_salario"] })
    render(<SalarioPage />)

    expect(screen.getByText("Este recurso não está disponível no seu plano.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
    expect(get.mock.calls.filter(([url]) => String(url).startsWith("/salary/"))).toHaveLength(0)
  })

  it("lista os salários a dividir; sem plano, dividir pede antes o modelo", async () => {
    render(<SalarioPage />)

    const lista = await screen.findByRole("list", { name: "Salários a dividir" })
    const itens = within(lista).getAllByRole("listitem")
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent("Salário de outubro")
    expect(itens[0]).toHaveTextContent("R$ 3.000,00")
    expect(itens[0]).toHaveTextContent("05/10/2026")
    expect(itens[1]).toHaveTextContent("Importado")

    await userEvent.click(within(itens[0]).getByRole("button", { name: /Dividir/ }))
    expect(await screen.findByRole("status")).toHaveTextContent("Escolha um modelo e salve o seu plano.")
    expect(screen.getByRole("region", { name: "Escolha do modelo" })).toBeInTheDocument()
  })

  it("sem salários a dividir, diz que não há nenhum", async () => {
    comRespostas({ "/salary/pending/": [], "/salary/references/": referencias(), "/salary/plan/": { has_plan: false, parts: [], salary_categories: [] } })
    render(<SalarioPage />)

    expect(await screen.findByText(/Nenhum salário a dividir/)).toBeInTheDocument()
  })

  it("mostra o comprometido no mês e as médias do histórico", async () => {
    render(<SalarioPage />)

    const comprometido = (await screen.findByText("Total comprometido")).parentElement!
    expect(comprometido).toHaveTextContent("R$ 1.650,00")
    expect(screen.getByText("Despesas recorrentes pendentes").parentElement).toHaveTextContent("R$ 1.200,00")
    expect(screen.getByText("Faturas que vencem no mês").parentElement).toHaveTextContent("R$ 450,00")
    expect(screen.getByText("Gastos: Essencial").parentElement).toHaveTextContent("R$ 1.860,00")
    expect(screen.getByText("Salário menos despesas").parentElement).toHaveTextContent("R$ 500,00")
    // Com 3 meses completos, nenhum aviso de meses
    expect(screen.queryByText(/Média de/)).not.toBeInTheDocument()
  })

  it("com um mês de histórico, avisa \"Média de 1 mês\"", async () => {
    comRespostas({ "/salary/pending/": [], "/salary/references/": referencias({ months_used: 1 }), "/salary/plan/": { has_plan: false, parts: [], salary_categories: [] } })
    render(<SalarioPage />)

    expect(await screen.findByText("Média de 1 mês")).toBeInTheDocument()
  })

  it("com dois meses de histórico, avisa \"Média de 2 meses\"", async () => {
    comRespostas({ "/salary/pending/": [], "/salary/references/": referencias({ months_used: 2 }), "/salary/plan/": { has_plan: false, parts: [], salary_categories: [] } })
    render(<SalarioPage />)

    expect(await screen.findByText("Média de 2 meses")).toBeInTheDocument()
  })
})
