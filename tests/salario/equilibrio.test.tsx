import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { repartirPercentual } from "@/lib/salario"
import { api } from "@/services/apiClient"
import type { PlanoDoSalario } from "@/types/salario"

import { usuario } from "../permissoes/acesso"
import { CATEGORIAS_DE_RECEITA, CONTAS, METAS, MODELOS, PLANO_SALVO, SEM_PLANO, parte, referencias, resposta } from "./dados"

// SALARIO-58: mudar o percentual de uma parte ajusta as outras não travadas na
// proporção de cada uma, mantendo a soma. SALARIO-59: a trava tira a parte dos
// ajustes. SALARIO-60: acima de 100%, o aviso e "Salvar plano" desabilitado.

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

const campo = (nome: string) => screen.getByLabelText(`Percentual de ${nome}`)

async function digitar(nome: string, valor: string) {
  await userEvent.clear(campo(nome))
  await userEvent.type(campo(nome), valor)
}

async function editar50_30_20() {
  render(<SalarioPage />)
  await userEvent.click(await screen.findByRole("button", { name: "Usar o modelo 50/30/20" }))
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  comPlano(SEM_PLANO)
  put.mockImplementation(((_url: string, corpo: unknown) => resposta({ ...PLANO_SALVO, ...(corpo as object) })) as typeof api.put)
})

describe("repartirPercentual", () => {
  it("reparte na proporção dos valores atuais, com a sobra do arredondamento na maior", () => {
    expect(repartirPercentual([3000, 2000], 4000)).toEqual([2400, 1600])
    // 100% em três partes iguais: 33,34% + 33,33% + 33,33%
    expect(repartirPercentual([100, 100, 100], 10000)).toEqual([3334, 3333, 3333])
    expect(repartirPercentual([1000, 3000], 1001)).toEqual([250, 751])
  })

  it("com todas zeradas, reparte em partes iguais; total negativo vira zero", () => {
    expect(repartirPercentual([0, 0], 6000)).toEqual([3000, 3000])
    expect(repartirPercentual([3000, 2000], -500)).toEqual([0, 0])
    expect(repartirPercentual([], 500)).toEqual([])
  })
})

// A página inteira é pesada no jsdom quando a suíte roda em paralelo
describe("Ajuste dos percentuais no editor", { timeout: 15000 }, () => {
  it("no 50/30/20, Essenciais em 60% deixa Dispensáveis com 24% e Guardar com 16%", async () => {
    await editar50_30_20()

    await digitar("Essenciais", "60")

    expect(campo("Essenciais")).toHaveValue("60")
    expect(campo("Dispensáveis")).toHaveValue("24")
    expect(campo("Guardar")).toHaveValue("16")
    expect(screen.getByText(/^Soma: 100%/)).toBeInTheDocument()

    // Saindo do campo, a próxima edição parte dos valores novos
    await userEvent.tab()
    await digitar("Dispensáveis", "43")
    expect(campo("Essenciais")).toHaveValue("45")
    expect(campo("Guardar")).toHaveValue("12")
  })

  it("com Guardar travada, Essenciais em 60% deixa Dispensáveis com 20%", async () => {
    await editar50_30_20()

    const trava = screen.getByRole("button", { name: "Travar Guardar" })
    expect(trava).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(trava)
    const destravar = screen.getByRole("button", { name: "Destravar Guardar" })
    expect(destravar).toHaveAttribute("aria-pressed", "true")

    await digitar("Essenciais", "60")

    expect(campo("Dispensáveis")).toHaveValue("20")
    expect(campo("Guardar")).toHaveValue("20")

    // Destravada, Guardar volta aos ajustes
    await userEvent.click(destravar)
    expect(screen.getByRole("button", { name: "Travar Guardar" })).toHaveAttribute("aria-pressed", "false")
    await digitar("Essenciais", "50")
    expect(campo("Dispensáveis")).toHaveValue("25")
    expect(campo("Guardar")).toHaveValue("25")
  })

  it("com as outras partes zeradas, a diferença é repartida em partes iguais", async () => {
    comPlano({
      ...PLANO_SALVO,
      parts: [
        parte({ id: "p-a", name: "Casa", value: "100.00", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário" }),
        parte({ id: "p-b", name: "Viagem", value: "0.00", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário" }),
        parte({ id: "p-c", name: "Cursos", value: "0.00", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário" }),
      ],
    })
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Editar plano" }))

    await digitar("Casa", "40")

    expect(campo("Viagem")).toHaveValue("30")
    expect(campo("Cursos")).toHaveValue("30")
  })

  it("com todas as outras travadas, só a parte editada muda, e acima de 100% avisa e não deixa salvar", async () => {
    await editar50_30_20()
    await userEvent.click(screen.getByRole("button", { name: "Travar Dispensáveis" }))
    await userEvent.click(screen.getByRole("button", { name: "Travar Guardar" }))
    const salvar = screen.getByRole("button", { name: "Salvar plano" })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    await digitar("Essenciais", "60")

    expect(campo("Dispensáveis")).toHaveValue("30")
    expect(campo("Guardar")).toHaveValue("20")
    expect(screen.getByText(/^Soma: 110%/)).toHaveClass("text-destructive")
    expect(screen.getByRole("alert")).toHaveTextContent("A soma dos percentuais passa de 100%.")
    expect(salvar).toBeDisabled()

    await digitar("Essenciais", "50")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(salvar).toBeEnabled()
  })

  it("\"Adicionar parte\" cria uma parte percentual com o que falta para 100%, com o foco no nome", async () => {
    await editar50_30_20()
    // O campo do percentual mostra o % dentro dele
    expect(campo("Essenciais").parentElement).toHaveTextContent("%")

    // Com 100% já repartidos, a parte nova começa em 0%
    await userEvent.click(screen.getByRole("button", { name: "Adicionar parte" }))
    expect(screen.getByLabelText("Percentual de parte 4")).toHaveValue("0")
    expect(document.activeElement).toBe(screen.getByLabelText("Nome da parte 4"))
    await userEvent.click(screen.getByRole("button", { name: "Remover parte 4" }))

    await userEvent.click(screen.getByRole("button", { name: "Travar Essenciais" }))
    await userEvent.click(screen.getByRole("button", { name: "Travar Dispensáveis" }))
    await digitar("Guardar", "7,5")
    await userEvent.click(screen.getByRole("button", { name: "Adicionar parte" }))

    expect(screen.getByLabelText("Percentual de parte 4")).toHaveValue("12,5")
    expect(document.activeElement).toBe(screen.getByLabelText("Nome da parte 4"))
    expect(screen.getByText(/^Soma: 100%/)).toBeInTheDocument()
    await userEvent.keyboard("Viagem")
    expect(screen.getByLabelText("Nome da parte 4")).toHaveValue("Viagem")
  })

  it("no Personalizado, a primeira parte começa com 100%", async () => {
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Usar o modelo Personalizado" }))

    await userEvent.click(screen.getByRole("button", { name: "Adicionar parte" }))

    expect(screen.getByLabelText("Percentual de parte 1")).toHaveValue("100")
    expect(document.activeElement).toBe(screen.getByLabelText("Nome da parte 1"))
  })

  it("as partes em R$ nunca são ajustadas, e as travas não vão para o plano", async () => {
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Usar o modelo 50/30/20" }))
    await userEvent.click(screen.getByRole("button", { name: "Adicionar parte" }))
    await userEvent.type(screen.getByLabelText("Nome da parte 4"), "Aluguel")
    await userEvent.click(within(screen.getByRole("listitem", { name: "Aluguel" })).getByRole("button", { name: "R$" }))
    await userEvent.type(screen.getByLabelText("Valor de Aluguel"), "800")
    await userEvent.tab()
    expect(screen.queryByRole("button", { name: /Travar Aluguel/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Travar Guardar" }))
    await digitar("Essenciais", "40")
    expect(campo("Dispensáveis")).toHaveValue("40")
    expect(screen.getByLabelText("Valor de Aluguel")).toHaveValue("R$ 800,00")

    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    const partes = (put.mock.calls[0][1] as { parts: Record<string, unknown>[] }).parts
    expect(partes.map((p) => p.value)).toEqual(["40.00", "40.00", "20.00", "800.00"])
    for (const enviada of partes) {
      expect(Object.keys(enviada).sort()).toEqual(["account", "destination_type", "goal", "name", "reference", "rule_type", "value"])
    }
  })
})
