import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { EXPLICACOES_DOS_MODELOS, explicacaoDaParte, normalizarNome } from "@/lib/explicacoes-dos-modelos"
import { api } from "@/services/apiClient"
import type { PlanoDoSalario } from "@/types/salario"

import { usuario } from "../permissoes/acesso"
import { CATEGORIAS_DE_RECEITA, CONTAS, METAS, MODELOS, PLANO_SALVO, SEM_PLANO, referencias, resposta } from "./dados"

// SALARIO-57: o que cada modelo e cada parte significam, com a obra de origem,
// em "Como funciona" na escolha e no botão de informação ao lado da parte

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

const linhaDoModelo = (nome: string) =>
  within(screen.getByRole("list", { name: "Modelos" })).getByRole("listitem", { name: nome })

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  comPlano(SEM_PLANO)
})

describe("Explicações dos modelos", () => {
  it("as partes conhecidas são achadas pelo nome sem acento, caixa ou espaços", () => {
    expect(normalizarNome("  Poupança para Gastos ")).toBe("poupanca para gastos")
    expect(explicacaoDaParte(" DISPENSAVEIS ")?.parte.nome).toBe("Dispensáveis")
    // "Guardar" segue o modelo do plano; sem ele, o sentido do 50/30/20
    expect(explicacaoDaParte("guardar")?.parte.percentual).toBe("20")
    expect(explicacaoDaParte("Guardar", "pague_se_primeiro")?.parte.percentual).toBe("10")
    expect(explicacaoDaParte("Aluguel")).toBeNull()
    // Sem travessões nos textos
    expect(JSON.stringify(EXPLICACOES_DOS_MODELOS)).not.toMatch(/—/)
  })
})

// A página inteira é pesada no jsdom quando a suíte roda em paralelo
describe("Explicações na página", { timeout: 15000 }, () => {
  it("\"Como funciona\" abre o que o modelo e cada parte significam, com a obra, sem escolher o modelo", async () => {
    render(<SalarioPage />)
    await screen.findByRole("list", { name: "Modelos" })

    const linha = linhaDoModelo("50/30/20")
    const botao = within(linha).getByRole("button", { name: "Como funciona" })
    expect(botao).toHaveAttribute("aria-expanded", "false")
    const painel = document.getElementById(botao.getAttribute("aria-controls")!)!
    expect(painel).not.toBeVisible()

    await userEvent.click(botao)

    expect(botao).toHaveAttribute("aria-expanded", "true")
    expect(painel).toBeVisible()
    expect(painel).toHaveTextContent("Dividir a renda em três grupos simples: o que é obrigatório, o que é escolha e o que é futuro.")
    expect(painel).toHaveTextContent("Essenciais (50%): O que você precisa pagar todo mês mesmo se a renda cair")
    expect(painel).toHaveTextContent("Dispensáveis (30%): O que deixa a vida melhor mas pode ser cortado")
    expect(painel).toHaveTextContent("Guardar (20%): Reserva de emergência, aposentadoria, investimentos e pagamento extra de dívidas.")
    expect(painel).toHaveTextContent("Fonte: Elizabeth Warren e Amelia Warren Tyagi, All Your Worth (2005)")
    // Continua na escolha: abrir a explicação não escolhe o modelo
    expect(screen.getByRole("region", { name: "Escolha do modelo" })).toBeInTheDocument()

    await userEvent.click(within(linhaDoModelo("Seis potes")).getByRole("button", { name: "Como funciona" }))
    expect(linhaDoModelo("Seis potes")).toHaveTextContent("Liberdade financeira (10%): Dinheiro para investir e gerar renda passiva")
    expect(linhaDoModelo("Seis potes")).toHaveTextContent("Fonte: T. Harv Eker, Os Segredos da Mente Milionária (2005)")

    await userEvent.click(within(linhaDoModelo("Pague-se primeiro")).getByRole("button", { name: "Como funciona" }))
    expect(linhaDoModelo("Pague-se primeiro")).toHaveTextContent("Fonte: George S. Clason, O Homem Mais Rico da Babilônia (1926)")

    await userEvent.click(within(linhaDoModelo("Personalizado")).getByRole("button", { name: "Como funciona" }))
    expect(linhaDoModelo("Personalizado")).toHaveTextContent(
      "Monte as partes do seu jeito. Comece pelo que precisa pagar e pelo que quer guardar.",
    )
  })

  it("no resumo, a parte conhecida tem o botão que explica o que ela é, com a obra", async () => {
    comPlano(PLANO_SALVO)
    render(<SalarioPage />)
    const partes = await screen.findByRole("list", { name: "Partes do plano" })

    await userEvent.click(within(partes).getByRole("button", { name: "O que é Dispensáveis" }))

    const explicacao = await screen.findByRole("dialog")
    expect(explicacao).toHaveTextContent("O que deixa a vida melhor mas pode ser cortado: lazer, restaurantes, assinaturas")
    expect(explicacao).toHaveTextContent("Fonte: Elizabeth Warren e Amelia Warren Tyagi, All Your Worth (2005)")
  })

  it("no editor, o botão segue o nome da parte enquanto ele é digitado", async () => {
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Usar o modelo Seis potes" }))

    await userEvent.click(screen.getByRole("button", { name: "O que é Liberdade financeira" }))
    const explicacao = await screen.findByRole("dialog")
    expect(explicacao).toHaveTextContent("não é para gastar, só os rendimentos no futuro")
    expect(explicacao).toHaveTextContent("Fonte: T. Harv Eker, Os Segredos da Mente Milionária (2005)")
    await userEvent.keyboard("{Escape}")

    const nome = screen.getByLabelText("Nome da parte 4")
    await userEvent.clear(nome)
    await userEvent.type(nome, "Curso de inglês")
    expect(screen.queryByRole("button", { name: /^O que é Curso/ })).not.toBeInTheDocument()
    await userEvent.clear(nome)
    await userEvent.type(nome, " educacao ")
    expect(screen.getByRole("button", { name: "O que é educacao" })).toBeInTheDocument()
  })
})
