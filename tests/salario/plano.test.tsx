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

function comPlano(plano: PlanoDoSalario, { contas = CONTAS, metas = METAS }: { contas?: unknown[]; metas?: unknown[] } = {}) {
  const dados: Record<string, unknown> = {
    "/salary/pending/": [],
    "/salary/references/": referencias(),
    "/salary/plan/": plano,
    "/salary/models/": MODELOS,
    "/accounts/": contas,
    "/goals/": metas,
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

// A página inteira é pesada no jsdom quando a suíte roda em paralelo
describe("Escolha do modelo e editor do plano", { timeout: 15000 }, () => {
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

  it("sem plano, o guia mostra as etapas e cada modelo com a proporção das partes", async () => {
    render(<SalarioPage />)

    const modelos = await screen.findByRole("list", { name: "Modelos" })
    const etapas = screen.getByRole("list", { name: "Etapas do plano" })
    const itens = within(etapas).getAllByRole("listitem")
    expect(itens).toHaveLength(3)
    expect(itens[0]).toHaveTextContent("Etapa 1: Receitas de salário")
    expect(itens[1]).toHaveTextContent("Etapa 2: Modelo")
    expect(itens[2]).toHaveTextContent("Etapa 3: Partes")
    expect(within(etapas).getAllByRole("listitem")[1]).toHaveAttribute("aria-current", "step")
    expect(await screen.findByText("Contam como salário: Salário.")).toBeInTheDocument()

    const linha = (nome: string) => within(modelos).getByRole("listitem", { name: nome })
    expect(within(linha("50/30/20")).getByRole("img")).toHaveAccessibleName(
      "Divisão do salário: Essenciais 50%, Dispensáveis 30%, Guardar 20%",
    )
    expect(within(linha("Pague-se primeiro")).getByRole("img")).toHaveAccessibleName("Divisão do salário: Guardar 10%, Livre 90%")
    expect(linha("Personalizado")).toHaveTextContent("Comece do zero")
    expect(within(linha("Personalizado")).queryByRole("img")).not.toBeInTheDocument()

    await usarModelo("Seis potes")
    expect(within(screen.getByRole("list", { name: "Etapas do plano" })).getAllByRole("listitem")[2]).toHaveAttribute("aria-current", "step")

    // "Alterar" leva às receitas de salário, com o foco na primeira categoria
    await userEvent.click(screen.getByRole("button", { name: "Alterar" }))
    expect(document.activeElement).toBe(
      within(screen.getByRole("region", { name: "Receitas de salário" })).getByRole("checkbox", { name: "Salário" }),
    )
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

  it("o destino oferece contas ativas, cofrinhos inclusive, e metas ativas, e a meta escolhida vai no plano", async () => {
    render(<SalarioPage />)
    await usarModelo("50/30/20")

    await userEvent.click(screen.getByLabelText("Destino de Guardar"))
    const opcoes = (await screen.findAllByRole("option")).map((o) => o.textContent)
    expect(opcoes).toEqual(["Fica na conta do salário", "Banco Azul", "Reserva", "Cofrinho Casa", "Viagem no Cofrinho Casa"])
    await userEvent.click(screen.getByRole("option", { name: "Viagem no Cofrinho Casa" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(corpoDoPut().parts[2]).toMatchObject({ name: "Guardar", destination_type: "GOAL", goal: "meta-viagem", account: null })
  })

  // O plano salvo abre no resumo; o editor abre no mesmo lugar com "Editar plano"
  it("com o plano salvo, a parte com a meta Viagem mostra quanto ela pede por mês", async () => {
    comPlano(PLANO_SALVO)
    render(<SalarioPage />)

    const noResumo = await vi.waitFor(() => parteNoEditor("Guardar"))
    expect(noResumo).toHaveTextContent("A meta pede R$ 250,00 por mês até 30/06/2027")
    expect(noResumo).toHaveTextContent("Meta: Viagem")
    expect(screen.queryByRole("list", { name: "Modelos" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Editar plano" }))
    const guardar = parteNoEditor("Guardar")
    expect(guardar).toHaveTextContent("A meta pede R$ 250,00 por mês até 30/06/2027")
    expect(within(guardar).getByLabelText("Destino de Guardar")).toHaveTextContent("Meta: Viagem")
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

    // O valor de cada parte entra na própria legenda do plano
    await vi.waitFor(() => expect(parteNoEditor("Essenciais")).toHaveTextContent("R$ 1.500,00"))
    expect(parteNoEditor("Dispensáveis")).toHaveTextContent("R$ 900,00")
    expect(parteNoEditor("Guardar")).toHaveTextContent("R$ 600,00")
    expect(screen.getByText("Fica livre na conta do salário").parentElement).toHaveTextContent("R$ 2.400,00")
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
        data: { parts: [{}, { value: ["O percentual deve ficar entre 0,01% e 100%."] }, { goal: ["Escolha uma conta ativa ou uma meta ativa."] }] },
      },
    })
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Editar plano" }))

    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() =>
      expect(parteNoEditor("Guardar")).toHaveTextContent("Escolha uma conta ativa ou uma meta ativa."),
    )
    expect(parteNoEditor("Dispensáveis")).toHaveTextContent("O percentual deve ficar entre 0,01% e 100%.")
    expect(parteNoEditor("Essenciais")).not.toHaveTextContent("O percentual deve")
  })

  // SALARIO-60: acima de 100% o editor não deixa salvar; o erro geral do
  // backend continua indo para o toast
  it("o erro geral do backend aparece no toast", async () => {
    comPlano(PLANO_SALVO)
    put.mockRejectedValue({ response: { status: 400, data: { detail: "Não foi possível salvar o plano agora." } } })
    render(<SalarioPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Editar plano" }))

    const percentual = screen.getByLabelText("Percentual de Guardar")
    await userEvent.clear(percentual)
    await userEvent.type(percentual, "40")
    expect(screen.getByText(/^Soma: 100%/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar o plano agora."))
    expect((put.mock.calls[0][1] as { parts: { value: string }[] }).parts[2].value).toBe("40.00")
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

  // As categorias saíram do editor: o painel Receitas de salário grava só elas
  it("desmarcar e marcar categorias de salário muda as categorias enviadas", async () => {
    comPlano(PLANO_SALVO)
    render(<SalarioPage />)
    const painel = await screen.findByRole("region", { name: "Receitas de salário" })

    expect(await within(painel).findByRole("checkbox", { name: "Salário" })).toBeChecked()
    expect(within(painel).getByRole("checkbox", { name: "Freelance" })).not.toBeChecked()
    await userEvent.click(within(painel).getByRole("checkbox", { name: "Freelance" }))
    await userEvent.click(within(painel).getByRole("button", { name: "Salvar" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put).toHaveBeenCalledWith("/salary/categories/", { salary_categories: ["cat-salario", "cat-freela"] })
  })
})

// SALARIO-05 e SALARIO-11: qualquer conta ativa é destino, cofrinhos
// inclusive, agrupada por tipo; as metas ativas vêm por último
describe("Destinos das partes agrupados por tipo", { timeout: 15000 }, () => {
  const CONTAS_DE_TODOS_OS_TIPOS = [
    { id: "cofre-b", name: "Cofrinho Viagem", type: "PIGGY_BANK", is_active: true, balance: "0.00" },
    { id: "invest", name: "Corretora", type: "INVESTMENT", is_active: true, balance: "0.00" },
    { id: "cart", name: "Carteira", type: "WALLET", is_active: true, balance: "0.00" },
    { id: "poup", name: "Poupança Caixa", type: "SAVINGS", is_active: true, balance: "0.00" },
    { id: "cc-z", name: "Zeta Banco", type: "CHECKING", is_active: true, balance: "0.00" },
    { id: "cc-a", name: "Ágil Banco", type: "CHECKING", is_active: true, balance: "0.00" },
    { id: "cc-b", name: "banco Beta", type: "CHECKING", is_active: true, balance: "0.00" },
    { id: "cofre-a", name: "Cofrinho Casa", type: "PIGGY_BANK", is_active: true, balance: "0.00" },
    { id: "velha", name: "Conta antiga", type: "CHECKING", is_active: false, balance: "0.00" },
    { id: "cofre-velho", name: "Cofrinho velho", type: "PIGGY_BANK", is_active: false, balance: "0.00" },
  ]
  const METAS_EM_COFRINHOS = [
    { id: "m-viagem", name: "Viagem", status: "IN_PROGRESS", is_active: true, target_amount: "100.00", current_amount: "0.00", account: "cofre-b" },
    { id: "m-casa", name: "Casa", status: "IN_PROGRESS", is_active: true, target_amount: "100.00", current_amount: "0.00", account: "cofre-a" },
    { id: "m-sem", name: "Avulsa", status: "IN_PROGRESS", is_active: true, target_amount: "100.00", current_amount: "0.00", account: "fora-da-lista" },
    { id: "m-velha", name: "Antiga", status: "COMPLETED", is_active: false, target_amount: "100.00", current_amount: "100.00", account: "cofre-a" },
  ]

  async function abrirDestinos(contas: unknown[] = CONTAS_DE_TODOS_OS_TIPOS, metas: unknown[] = METAS_EM_COFRINHOS) {
    comPlano(SEM_PLANO, { contas, metas })
    render(<SalarioPage />)
    await usarModelo("50/30/20")
    await userEvent.click(screen.getByLabelText("Destino de Guardar"))
    return screen.findByRole("listbox")
  }

  const nomesDasOpcoes = (grupo: HTMLElement) => within(grupo).getAllByRole("option").map((o) => o.textContent)

  it("os grupos seguem a ordem dos tipos, com as metas por último", async () => {
    const lista = await abrirDestinos()

    const grupos = within(lista).getAllByRole("group").map((g) => g.getAttribute("aria-labelledby"))
    const rotulos = grupos.map((id) => document.getElementById(id ?? "")?.textContent)
    expect(rotulos).toEqual(["Contas correntes", "Poupanças", "Carteiras", "Investimentos", "Cofrinhos", "Metas"])
    expect(within(lista).getAllByRole("option")[0]).toHaveTextContent("Fica na conta do salário")
  })

  it("as contas de cada grupo vêm por nome, sem diferenciar acento nem maiúscula", async () => {
    await abrirDestinos()

    expect(nomesDasOpcoes(screen.getByRole("group", { name: "Contas correntes" }))).toEqual(["Ágil Banco", "banco Beta", "Zeta Banco"])
  })

  it("os cofrinhos aparecem no grupo Cofrinhos e podem ser o destino", async () => {
    await abrirDestinos()

    expect(nomesDasOpcoes(screen.getByRole("group", { name: "Cofrinhos" }))).toEqual(["Cofrinho Casa", "Cofrinho Viagem"])
    await userEvent.click(screen.getByRole("option", { name: "Cofrinho Casa" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(corpoDoPut().parts[2]).toMatchObject({ name: "Guardar", destination_type: "ACCOUNT", account: "cofre-a", goal: null })
  })

  it("contas e metas inativas não aparecem", async () => {
    const lista = await abrirDestinos()

    const opcoes = within(lista).getAllByRole("option").map((o) => o.textContent)
    expect(opcoes).not.toContain("Conta antiga")
    expect(opcoes).not.toContain("Cofrinho velho")
    expect(opcoes.some((o) => o?.startsWith("Antiga"))).toBe(false)
  })

  it("as metas vêm no grupo Metas, por nome, com o cofrinho de cada uma quando ele é conhecido", async () => {
    await abrirDestinos()

    const metas = screen.getByRole("group", { name: "Metas" })
    expect(nomesDasOpcoes(metas)).toEqual(["Avulsa", "Casa no Cofrinho Casa", "Viagem no Cofrinho Viagem"])
    expect(within(metas).getByText("no Cofrinho Casa")).toHaveClass("text-muted-foreground")
  })

  it("um tipo sem conta ativa não vira grupo", async () => {
    const lista = await abrirDestinos(
      [
        { id: "cc", name: "Banco", type: "CHECKING", is_active: true, balance: "0.00" },
        { id: "cofre", name: "Cofrinho", type: "PIGGY_BANK", is_active: false, balance: "0.00" },
      ],
      [],
    )

    expect(within(lista).getAllByRole("group")).toHaveLength(1)
    expect(screen.getByRole("group", { name: "Contas correntes" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Cofrinhos" })).not.toBeInTheDocument()
  })
})
