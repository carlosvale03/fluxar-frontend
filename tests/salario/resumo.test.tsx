import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { ParteDoPlano, PlanoDoSalario } from "@/types/salario"

import { usuario } from "../permissoes/acesso"
import { CATEGORIAS_DE_RECEITA, CONTAS, METAS, MODELOS, PLANO_SALVO, SEM_PLANO, parte, recebimento, referencias, resposta } from "./dados"

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

function comPlano(plano: PlanoDoSalario, pendentes: unknown[] = []) {
  const dados: Record<string, unknown> = {
    "/salary/pending/": pendentes,
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
// média de R$ 3.000,00, o fixo sai antes (10%) e os percentuais valem sobre
// R$ 2.700,00 (R$ 1.350,00 e R$ 810,00), com R$ 540,00 (18%) livres
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
  it("o campo da simulação já vem com o valor do salário recebido mais recente", async () => {
    comPlano(PLANO_SALVO, [recebimento({ amount: "4200.00" })])
    render(<SalarioPage />)

    const campo = await screen.findByLabelText("Valor do salário")

    await vi.waitFor(() => expect((campo as HTMLInputElement).value).toMatch(/4\.200,00/))
  })

  it("sem salário recebido, o campo da simulação começa vazio", async () => {
    render(<SalarioPage />)

    const campo = await screen.findByLabelText("Valor do salário")

    expect((campo as HTMLInputElement).value).toBe("")
  })

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
    expect(within(partes()).queryByRole("listitem", { name: "Livre na conta do salário" })).not.toBeInTheDocument()
    // Fora da edição, nenhum campo das partes
    expect(screen.queryByLabelText("Percentual de Guardar")).not.toBeInTheDocument()
  })

  it("o que não vai para nenhuma parte aparece como Livre na conta do salário, e a parte sem destino é avisada", async () => {
    comPlano(PLANO_COM_LIVRE)
    render(<SalarioPage />)
    await regiaoDoPlano()

    expect(barra()).toHaveAccessibleName("Divisão do salário: Essenciais 45%, Guardar 27%, Reserva 10%, Livre 18%")
    const livre = legenda("Livre na conta do salário")
    expect(livre).toHaveTextContent("R$ 540,00")
    expect(livre).toHaveTextContent("18%")
    // O livre fica por último, com o ponto cinza
    expect(within(partes()).getAllByRole("listitem").at(-1)).toBe(livre)
    expect(livre.querySelector(".bg-muted-foreground\\/30")).not.toBeNull()
    expect(within(legenda("Guardar")).getByRole("button", { name: "Escolher destino de Guardar" })).toBeInTheDocument()
    expect(within(legenda("Essenciais")).queryByRole("button", { name: /Escolher destino/ })).not.toBeInTheDocument()
    expect(legenda("Reserva")).toHaveTextContent("R$ 300,00")
    expect(screen.getByText("Plano ativo: 3 partes")).toBeInTheDocument()
  })

  it("\"Escolher destino\" abre o editor com o foco no destino da parte", async () => {
    comPlano(PLANO_COM_LIVRE)
    render(<SalarioPage />)
    await regiaoDoPlano()

    await userEvent.click(within(legenda("Guardar")).getByRole("button", { name: "Escolher destino de Guardar" }))

    const destino = await screen.findByLabelText("Destino de Guardar")
    expect(screen.getByRole("button", { name: "Salvar plano" })).toBeInTheDocument()
    await vi.waitFor(() => expect(document.activeElement).toBe(destino))
  })

  it("com uma parte fixa, as prévias tiram o fixo antes e aplicam os percentuais sobre o que sobra", async () => {
    // R$ 500,00 fixos e 50/30/20 com o salário recebido de R$ 3.000,00
    const comFixa: PlanoDoSalario = {
      ...PLANO_SALVO,
      parts: [
        parte({ id: "p-alu", name: "Aluguel", rule_type: "FIXED", value: "500.00", destination_type: "ACCOUNT", destination_name: "Reserva", account: "conta-reserva" }),
        ...PLANO_SALVO.parts,
      ],
    }
    comPlano(comFixa, [recebimento()])
    render(<SalarioPage />)
    await regiaoDoPlano()

    await vi.waitFor(() => expect(legenda("Essenciais")).toHaveTextContent("R$ 1.250,00"))
    expect(legenda("Essenciais")).toHaveTextContent("50%")
    expect(legenda("Dispensáveis")).toHaveTextContent("R$ 750,00")
    expect(legenda("Guardar")).toHaveTextContent("R$ 500,00")
    expect(legenda("Aluguel")).toHaveTextContent("R$ 500,00")
    expect(screen.getByText(/^Com o salário de R\$\s3\.000,00/)).toHaveTextContent("Os percentuais valem sobre o que sobra")
    expect(within(partes()).queryByRole("listitem", { name: "Livre na conta do salário" })).not.toBeInTheDocument()

    // O valor digitado muda as prévias antes de simular
    const campo = screen.getByLabelText("Valor do salário")
    await userEvent.clear(campo)
    await userEvent.type(campo, "1500")
    expect(legenda("Essenciais")).toHaveTextContent("R$ 500,00")
    expect(legenda("Guardar")).toHaveTextContent("R$ 200,00")

    // No editor, o mesmo valor e o quanto cada parte recebe, antes de salvar
    await userEvent.click(screen.getByRole("button", { name: "Editar plano" }))
    expect((screen.getByLabelText("Valor do salário") as HTMLInputElement).value).toMatch(/1\.500,00/)
    expect(within(partes()).getByRole("listitem", { name: "Essenciais" })).toHaveTextContent("Recebe R$ 500,00")
    await userEvent.clear(screen.getByLabelText("Valor do salário"))
    await userEvent.type(screen.getByLabelText("Valor do salário"), "3000")
    expect(within(partes()).getByRole("listitem", { name: "Essenciais" })).toHaveTextContent("Recebe R$ 1.250,00")
    expect(within(partes()).getByRole("listitem", { name: "Dispensáveis" })).toHaveTextContent("Recebe R$ 750,00")
    expect(put).not.toHaveBeenCalled()
    expect(vi.mocked(api.post)).not.toHaveBeenCalled()
  })

  it("sem salário recebido nem simulado, as prévias usam a média do histórico e dizem isso", async () => {
    render(<SalarioPage />)
    await regiaoDoPlano()

    expect(await screen.findByText(/^Com a média do seu salário \(R\$\s3\.000,00\)/)).toBeInTheDocument()
    expect(legenda("Essenciais")).toHaveTextContent("R$ 1.500,00")
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

  it("trocar de modelo a partir do resumo mantém o plano salvo até o novo ser salvo", async () => {
    put.mockImplementation(((_url: string, corpo: unknown) => {
      const enviado = corpo as { parts: Partial<ParteDoPlano>[]; salary_categories: string[] }
      return resposta({
        has_plan: true,
        parts: enviado.parts.map((p, i) => parte({ ...p, id: `nova-${i}` })),
        salary_categories: enviado.salary_categories,
      })
    }) as typeof api.put)
    render(<SalarioPage />)
    await regiaoDoPlano()

    // SALARIO-61: do resumo, a escolha abre com a volta ao plano salvo
    await userEvent.click(screen.getByRole("button", { name: "Trocar de modelo" }))
    expect(screen.getByRole("region", { name: "Escolha do modelo" })).toBeInTheDocument()
    expect(screen.getByText("Plano ativo: 50/30/20")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao meu plano" }))
    expect(legenda("Essenciais")).toHaveTextContent("50%")

    // Escolher outro modelo e cancelar também volta ao plano salvo
    await userEvent.click(screen.getByRole("button", { name: "Trocar de modelo" }))
    await userEvent.click(screen.getByRole("button", { name: "Usar o modelo Seis potes" }))
    expect(screen.getByLabelText("Percentual de Necessidades")).toHaveValue("55")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(legenda("Essenciais")).toHaveTextContent("50%")
    expect(put).not.toHaveBeenCalled()

    // Só ao salvar o plano novo substitui o antigo
    await userEvent.click(screen.getByRole("button", { name: "Trocar de modelo" }))
    await userEvent.click(screen.getByRole("button", { name: "Usar o modelo Seis potes" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect((put.mock.calls[0][1] as { parts: { name: string }[] }).parts.map((p) => p.name)).toEqual([
      "Necessidades",
      "Liberdade financeira",
      "Poupança para gastos futuros",
      "Educação",
      "Diversão",
      "Doações",
    ])
    expect(await screen.findByText("Plano ativo: Seis potes")).toBeInTheDocument()
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
