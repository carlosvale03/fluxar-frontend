import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { PlanoDoSalario } from "@/types/salario"

import { usuario } from "../permissoes/acesso"
import { CATEGORIAS_DE_RECEITA, CONTAS, METAS, MODELOS, PLANO_SALVO, SEM_PLANO, referencias, resposta } from "./dados"

// SALARIO-01: a escolha mostra os quatro modelos com a obra. SALARIO-04 a
// SALARIO-07: o editor monta as partes com regra, valor, destino e ordem.
// SALARIO-13: simulação. SALARIO-14: categorias de salário. SALARIO-54:
// "X% no seu histórico". SALARIO-55: quanto a meta pede por mês.

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

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
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

const parteNoEditor = (nome: string) =>
  within(screen.getByRole("list", { name: "Partes do plano" })).getByRole("listitem", { name: nome })

const corpoDoPut = () => put.mock.calls[0][1] as { parts: Record<string, unknown>[]; salary_categories: string[] }

async function usarModelo(nome: string) {
  await userEvent.click(await screen.findByRole("button", { name: `Usar o modelo ${nome}` }))
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  comPlano(SEM_PLANO)
  put.mockImplementation(((_url: string, corpo: unknown) => resposta({ ...PLANO_SALVO, ...(corpo as object) })) as typeof api.put)
})

describe("Escolha do modelo e editor do plano", () => {
  it("sem plano, a escolha mostra os quatro modelos com a obra de origem", async () => {
    render(<SalarioPage />)

    const modelos = await screen.findByRole("list", { name: "Modelos" })
    const cartoes = within(modelos).getAllByRole("listitem", { name: /.+/ }).filter((li) => li.parentElement === modelos)
    expect(cartoes.map((c) => c.getAttribute("aria-label"))).toEqual(["Pague-se primeiro", "50/30/20", "Seis potes", "Personalizado"])
    expect(cartoes[0]).toHaveTextContent("George S. Clason, O Homem Mais Rico da Babilônia")
    expect(cartoes[1]).toHaveTextContent("All Your Worth")
    expect(cartoes[2]).toHaveTextContent("Os Segredos da Mente Milionária")
    expect(cartoes[1]).toHaveTextContent("Essenciais50%")
    // SALARIO-54: ao comparar os modelos, a parte da classe mostra o histórico
    expect(cartoes[1]).toHaveTextContent("62,0% no seu histórico")
  })

  it("o 50/30/20 enche o editor, e subir uma parte muda a ordem enviada", async () => {
    render(<SalarioPage />)
    await usarModelo("50/30/20")

    const partes = within(screen.getByRole("list", { name: "Partes do plano" })).getAllByRole("listitem")
    expect(partes.map((p) => p.getAttribute("aria-label"))).toEqual(["Essenciais", "Dispensáveis", "Guardar"])
    expect(screen.getByLabelText("Percentual de Essenciais")).toHaveValue("50")
    expect(within(parteNoEditor("Essenciais")).getByLabelText("Destino de Essenciais")).toHaveTextContent("Fica na conta do salário")
    expect(parteNoEditor("Guardar")).toHaveTextContent("Escolha o destino antes de dividir.")

    await userEvent.click(screen.getByRole("button", { name: "Subir Guardar" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put.mock.calls[0][0]).toBe("/salary/plan/")
    const corpo = corpoDoPut()
    expect(corpo.parts.map((p) => p.name)).toEqual(["Essenciais", "Guardar", "Dispensáveis"])
    expect(corpo.parts[0]).toMatchObject({ rule_type: "PERCENT", value: "50.00", destination_type: "SALARY_ACCOUNT", reference: "ESSENCIAL" })
    expect(corpo.parts[1]).toMatchObject({ value: "20.00", destination_type: null, account: null, goal: null })
    expect(corpo.salary_categories).toEqual(["cat-salario"])
  })

  it("a parte com referência mostra \"62,0% no seu histórico\"", async () => {
    render(<SalarioPage />)
    await usarModelo("50/30/20")

    expect(parteNoEditor("Essenciais")).toHaveTextContent("62,0% no seu histórico")
    // 640 de 3.000 = 21,3%
    expect(parteNoEditor("Dispensáveis")).toHaveTextContent("21,3% no seu histórico")
    expect(parteNoEditor("Guardar")).not.toHaveTextContent("no seu histórico")
  })

  it("o destino oferece contas ativas que não são cofrinho e metas ativas, e a meta escolhida vai no plano", async () => {
    render(<SalarioPage />)
    await usarModelo("50/30/20")

    await userEvent.click(screen.getByLabelText("Destino de Guardar"))
    const opcoes = (await screen.findAllByRole("option")).map((o) => o.textContent)
    expect(opcoes).toEqual(["Fica na conta do salário", "Banco Azul", "Reserva", "Meta: Viagem"])
    await userEvent.click(screen.getByRole("option", { name: "Meta: Viagem" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(corpoDoPut().parts[2]).toMatchObject({ name: "Guardar", destination_type: "GOAL", goal: "meta-viagem", account: null })
  })

  it("com o plano salvo, a parte com a meta Viagem mostra quanto ela pede por mês", async () => {
    comPlano(PLANO_SALVO)
    render(<SalarioPage />)

    const guardar = await vi.waitFor(() => parteNoEditor("Guardar"))
    expect(guardar).toHaveTextContent("A meta pede R$ 250,00 por mês até 30/06/2027")
    expect(within(guardar).getByLabelText("Destino de Guardar")).toHaveTextContent("Meta: Viagem")
    expect(screen.queryByRole("list", { name: "Modelos" })).not.toBeInTheDocument()
  })

  it("simular R$ 3.000,00 mostra o valor de cada parte e o livre, sem salvar", async () => {
    comPlano(PLANO_SALVO)
    post.mockImplementation((() =>
      resposta({
        amount: "3000.00",
        items: [
          { part_id: null, name: "Essenciais", destination_type: "SALARY_ACCOUNT", destination_name: null, amount: "1500.00", reduced: false, adjusted: false, generates_transaction: false },
          { part_id: null, name: "Dispensáveis", destination_type: "SALARY_ACCOUNT", destination_name: null, amount: "900.00", reduced: false, adjusted: false, generates_transaction: false },
          { part_id: null, name: "Guardar", destination_type: "GOAL", destination_name: "Viagem", amount: "600.00", reduced: false, adjusted: false, generates_transaction: true },
        ],
        total: "600.00",
        free: "2400.00",
      })) as typeof api.post)
    render(<SalarioPage />)
    await vi.waitFor(() => parteNoEditor("Guardar"))

    await userEvent.type(screen.getByLabelText("Valor do salário"), "3000")
    await userEvent.click(screen.getByRole("button", { name: "Simular" }))

    const resultado = await screen.findByRole("list", { name: "Resultado da simulação" })
    const linhas = within(resultado).getAllByRole("listitem").map((li) => li.textContent?.replace(/\s/g, " "))
    expect(linhas).toEqual([
      "EssenciaisR$ 1.500,00",
      "DispensáveisR$ 900,00",
      "GuardarR$ 600,00",
      "Fica livre na conta do salárioR$ 2.400,00",
    ])
    expect(post).toHaveBeenCalledWith("/salary/simulate/", expect.objectContaining({ amount: "3000.00" }))
    const enviado = post.mock.calls[0][1] as { parts: Record<string, unknown>[] }
    expect(enviado.parts.map((p) => p.name)).toEqual(["Essenciais", "Dispensáveis", "Guardar"])
    expect(put).not.toHaveBeenCalled()
  })

  it("o erro do backend aparece na parte certa", async () => {
    comPlano(PLANO_SALVO)
    put.mockRejectedValue({
      response: {
        status: 400,
        data: { parts: [{}, { value: ["O percentual deve ficar entre 0,01% e 100%."] }, { goal: ["Escolha uma conta ativa que não seja cofrinho ou uma meta ativa."] }] },
      },
    })
    render(<SalarioPage />)
    await vi.waitFor(() => parteNoEditor("Guardar"))

    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() =>
      expect(parteNoEditor("Guardar")).toHaveTextContent("Escolha uma conta ativa que não seja cofrinho ou uma meta ativa."),
    )
    expect(parteNoEditor("Dispensáveis")).toHaveTextContent("O percentual deve ficar entre 0,01% e 100%.")
    expect(parteNoEditor("Essenciais")).not.toHaveTextContent("O percentual deve")
  })

  it("a soma acima de 100% mostra a mensagem do backend no toast", async () => {
    comPlano(PLANO_SALVO)
    put.mockRejectedValue({ response: { status: 400, data: { detail: "A soma dos percentuais passa de 100%." } } })
    render(<SalarioPage />)
    await vi.waitFor(() => parteNoEditor("Guardar"))

    const percentual = screen.getByLabelText("Percentual de Guardar")
    await userEvent.clear(percentual)
    await userEvent.type(percentual, "60")
    expect(screen.getByText("Soma dos percentuais: 140%")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("A soma dos percentuais passa de 100%."))
    expect((put.mock.calls[0][1] as { parts: { value: string }[] }).parts[2].value).toBe("60.00")
  })

  it("o Personalizado começa sem partes; adicionar, nomear e escolher valor fixo monta a parte", async () => {
    render(<SalarioPage />)
    await usarModelo("Personalizado")

    expect(screen.getByText(/Nenhuma parte ainda/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Adicionar parte" }))
    await userEvent.type(screen.getByLabelText("Nome da parte 1"), "Aluguel")
    await userEvent.click(within(parteNoEditor("Aluguel")).getByRole("button", { name: "R$" }))
    await userEvent.type(screen.getByLabelText("Valor de Aluguel"), "1200")
    await userEvent.click(screen.getByLabelText("Destino de Aluguel"))
    await userEvent.click(await screen.findByRole("option", { name: "Reserva" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(corpoDoPut().parts).toEqual([
      expect.objectContaining({ name: "Aluguel", rule_type: "FIXED", value: "1200.00", destination_type: "ACCOUNT", account: "conta-reserva" }),
    ])
  })

  it("desmarcar e marcar categorias de salário muda as categorias enviadas", async () => {
    comPlano(PLANO_SALVO)
    render(<SalarioPage />)
    await vi.waitFor(() => parteNoEditor("Guardar"))

    expect(screen.getByRole("checkbox", { name: "Salário" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Freelance" })).not.toBeChecked()
    await userEvent.click(screen.getByRole("checkbox", { name: "Freelance" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(corpoDoPut().salary_categories).toEqual(["cat-salario", "cat-freela"])
  })
})
