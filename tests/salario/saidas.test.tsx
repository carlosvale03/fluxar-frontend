import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { deCentavos, paraCentavos } from "@/lib/dinheiro"
import { api } from "@/services/apiClient"
import type { SaidaDoSalario, SaidasDaDivisao } from "@/types/salario"

import { usuario } from "../permissoes/acesso"
import {
  CATEGORIAS_DE_RECEITA,
  CONTAS,
  METAS,
  MODELOS,
  PLANO_SALVO,
  divisao,
  recebimento,
  referencias,
  resposta,
  revisao,
  saida,
} from "./dados"

// SALARIO-71: a revisão lista as saídas da conta do salário desde o
// recebimento, com data, descrição, valor e a parte escolhida (já com a
// sugestão de SALARIO-65 e a opção "Não descontar"), e mostra em cada parte o
// calculado, o já gasto e o que será transferido. SALARIO-67: a parte que
// passou do valor avisa quanto passou e fica sem transação. SALARIO-68: a
// geração envia as saídas escolhidas. SALARIO-72: o livre desconta as saídas.

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

// O Select do Radix usa APIs que o jsdom não tem
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

const SAIDAS: SaidaDoSalario[] = [
  saida({ id: "s-1", description: "Mercado", amount: "130.00", suggested_part_id: "p-ess" }),
  saida({
    id: "s-2",
    date: "2026-10-07",
    description: "Guardar para a viagem",
    amount: "100.00",
    type: "TRANSFER_OUT",
    destination_name: "Viagem",
    category_name: null,
    suggested_part_id: "p-gua",
  }),
  saida({
    id: "s-3",
    date: "2026-10-08",
    description: "Fatura de setembro",
    amount: "650.00",
    type: "INVOICE_PAYMENT",
    destination_name: "Nubank",
    category_name: null,
  }),
]

const SUGERIDAS = { "s-1": "p-ess", "s-2": "p-gua", "s-3": null }

// O cálculo do backend: cada parte transfere o valor menos as saídas
// atribuídas a ela, sem ficar negativa, e o livre desconta as saídas
function previa(saidas: SaidaDoSalario[], escolhas?: SaidasDaDivisao) {
  const base = revisao()
  const gastos: Record<string, number> = {}
  let descontado = 0
  for (const item of saidas) {
    const parte = escolhas?.[item.id]
    if (!parte) continue
    gastos[parte] = (gastos[parte] ?? 0) + paraCentavos(item.amount)
    descontado += paraCentavos(item.amount)
  }
  const items = base.items.map((item) => {
    const valor = paraCentavos(item.amount)
    const gasto = gastos[item.part_id as string] ?? 0
    const transferir = Math.max(0, valor - gasto)
    return {
      ...item,
      spent: deCentavos(gasto),
      transfer: deCentavos(transferir),
      exceeded: deCentavos(Math.max(0, gasto - valor)),
      generates_transaction: item.destination_type === "GOAL" && transferir > 0,
    }
  })
  const total = items.filter((item) => item.generates_transaction).reduce((soma, item) => soma + paraCentavos(item.transfer), 0)
  return revisao({
    items,
    outflows: saidas.map((item) => ({ ...item, part_id: escolhas?.[item.id] ?? null })),
    total: deCentavos(total),
    free: deCentavos(300000 - total - descontado),
  })
}

let saidasDaConta: SaidaDoSalario[]

const chamadasDaPrevia = () =>
  post.mock.calls.filter(([url]) => url === "/salary/divisions/preview/").map(([, corpo]) => corpo)
const dialogo = () => screen.findByRole("dialog")
const botaoGerar = () => screen.getByRole("button", { name: /^Gerar/ })
const parteNaRevisao = (janela: HTMLElement, nome: string) => within(janela).getByRole("listitem", { name: nome })
const saidaNaRevisao = (janela: HTMLElement, descricao: string) =>
  within(within(janela).getByRole("list", { name: "Saídas desde o salário" })).getByRole("listitem", { name: descricao })

async function escolher(janela: HTMLElement, descricao: string, opcao: string) {
  await userEvent.click(within(janela).getByRole("combobox", { name: `Parte de ${descricao}` }))
  await userEvent.click(await screen.findByRole("option", { name: opcao }))
}

async function abrirRevisao() {
  render(<SalarioPage />)
  await screen.findByRole("region", { name: "Plano de divisão" })
  await userEvent.click(await screen.findByRole("button", { name: /Dividir/ }))
  const janela = await dialogo()
  await within(janela).findAllByRole("list", { name: /Transações que serão criadas|Partes que ficam/ })
  return janela
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  saidasDaConta = SAIDAS
  const dados: Record<string, unknown> = {
    "/salary/pending/": [recebimento()],
    "/salary/references/": referencias(),
    "/salary/plan/": PLANO_SALVO,
    "/salary/models/": MODELOS,
    "/accounts/": CONTAS,
    "/goals/": METAS,
    "/categories/": CATEGORIAS_DE_RECEITA,
  }
  get.mockImplementation(((url: string) => resposta(dados[url] ?? [])) as typeof api.get)
  post.mockImplementation(((url: string, corpo: { outflows?: SaidasDaDivisao }) => {
    if (url === "/salary/divisions/preview/") {
      const resultado = previa(saidasDaConta, corpo?.outflows)
      // Sem `outflows`, cada saída vem com a parte sugerida
      return resposta(corpo?.outflows ? resultado : { ...resultado, outflows: saidasDaConta })
    }
    if (url === "/salary/divisions/") {
      return resposta(
        divisao({
          outflows: [
            { id: "s-1", date: "2026-10-06", description: "Mercado", amount: "130.00", type: "EXPENSE", part_name: "Essenciais" },
            { id: "s-2", date: "2026-10-07", description: "Guardar para a viagem", amount: "100.00", type: "TRANSFER_OUT", part_name: "Guardar" },
          ],
        }),
      )
    }
    return resposta({})
  }) as typeof api.post)
})

// A página inteira é pesada no jsdom quando a suíte roda em paralelo
describe("Saídas desde o salário na revisão", { timeout: 15000 }, () => {
  it("a parte que fica na conta mostra o que ainda resta depois dos gastos", async () => {
    const janela = await abrirRevisao()

    const essenciais = parteNaRevisao(janela, "Essenciais")
    await vi.waitFor(() => expect(essenciais).toHaveTextContent("Já gasto R$ 130,00"))
    expect(essenciais).toHaveTextContent(/Resta\s*R\$\s*1\.370,00/)
  })

  it("pede a prévia sem saídas, aplica as sugestões e pede de novo já descontando", async () => {
    const janela = await abrirRevisao()

    await vi.waitFor(() => expect(chamadasDaPrevia()).toHaveLength(2))
    expect(chamadasDaPrevia()[0]).toEqual({ receipt: "rec-1" })
    expect(chamadasDaPrevia()[1]).toEqual({ receipt: "rec-1", outflows: SUGERIDAS })

    expect(within(janela).getByText("O que já saiu da conta do salário desde que ele caiu. Escolha de qual parte saiu cada valor.")).toBeInTheDocument()
    const mercado = saidaNaRevisao(janela, "Mercado")
    expect(mercado).toHaveTextContent("06/10 · Saída (Alimentação)")
    expect(mercado).toHaveTextContent("R$ 130,00")
    expect(within(mercado).getByRole("combobox", { name: "Parte de Mercado" })).toHaveTextContent("Essenciais")
    expect(mercado).toHaveTextContent("Sugerida")
    const aporte = saidaNaRevisao(janela, "Guardar para a viagem")
    expect(aporte).toHaveTextContent("07/10 · Aporte em Viagem")
    expect(within(aporte).getByRole("combobox")).toHaveTextContent("Guardar")
    const fatura = saidaNaRevisao(janela, "Fatura de setembro")
    expect(fatura).toHaveTextContent("08/10 · Fatura do Nubank")
    expect(within(fatura).getByRole("combobox")).toHaveTextContent("Não descontar")
    expect(fatura).not.toHaveTextContent("Sugerida")

    const guardar = parteNaRevisao(janela, "Guardar")
    expect(guardar).toHaveTextContent("Calculado R$ 600,00")
    expect(guardar).toHaveTextContent("Já gasto R$ 100,00")
    expect(guardar).toHaveTextContent("Transferir R$ 500,00")
    expect(parteNaRevisao(janela, "Essenciais")).toHaveTextContent("Já gasto R$ 130,00")
    expect(parteNaRevisao(janela, "Dispensáveis")).not.toHaveTextContent("Já gasto")
    // O ajuste troca o valor da parte antes de descontar as saídas
    expect(within(guardar).getByLabelText("Ajustar Guardar")).toHaveAccessibleDescription("Valor da parte antes de descontar as saídas")

    expect(within(janela).getByTestId("recebido-da-divisao")).toHaveTextContent("R$ 3.000,00")
    expect(within(janela).getByTestId("gasto-da-divisao")).toHaveTextContent("R$ 230,00")
    expect(within(janela).getByTestId("total-da-divisao")).toHaveTextContent("R$ 500,00")
    expect(within(janela).getByTestId("livre-da-divisao")).toHaveTextContent("R$ 2.270,00")
    expect(botaoGerar().textContent?.replace(/\s/g, " ")).toBe("Gerar 1 lançamento de R$ 500,00")
  })

  it("trocar a parte de uma saída pede a prévia com o novo mapa e atualiza o Transferir", async () => {
    const janela = await abrirRevisao()
    await vi.waitFor(() => expect(parteNaRevisao(janela, "Guardar")).toHaveTextContent("Transferir R$ 500,00"))

    await escolher(janela, "Mercado", "Guardar")

    await vi.waitFor(() => expect(parteNaRevisao(janela, "Guardar")).toHaveTextContent("Transferir R$ 370,00"))
    expect(chamadasDaPrevia()).toHaveLength(3)
    expect(chamadasDaPrevia()[2]).toEqual({ receipt: "rec-1", outflows: { ...SUGERIDAS, "s-1": "p-gua" } })
    expect(parteNaRevisao(janela, "Guardar")).toHaveTextContent("Já gasto R$ 230,00")
    expect(saidaNaRevisao(janela, "Mercado")).not.toHaveTextContent("Sugerida")
    expect(botaoGerar().textContent?.replace(/\s/g, " ")).toBe("Gerar 1 lançamento de R$ 370,00")
  })

  it("\"Não descontar\" envia null para a saída e devolve o valor à parte", async () => {
    const janela = await abrirRevisao()
    await vi.waitFor(() => expect(chamadasDaPrevia()).toHaveLength(2))

    await escolher(janela, "Guardar para a viagem", "Não descontar")

    await vi.waitFor(() => expect(parteNaRevisao(janela, "Guardar")).toHaveTextContent("Transferir R$ 600,00"))
    expect(chamadasDaPrevia()[2]).toEqual({ receipt: "rec-1", outflows: { ...SUGERIDAS, "s-2": null } })
    expect(parteNaRevisao(janela, "Guardar")).not.toHaveTextContent("Já gasto")
    expect(within(janela).getByTestId("gasto-da-divisao")).toHaveTextContent("R$ 130,00")
  })

  it("duas trocas seguidas fazem um pedido só, com as duas escolhas", async () => {
    const janela = await abrirRevisao()
    await vi.waitFor(() => expect(chamadasDaPrevia()).toHaveLength(2))

    // Com o relógio falso, a espera de 300 ms do recálculo só passa quando o
    // teste manda, por mais lenta que seja a máquina. A Testing Library só
    // avança o relógio falso que reconhece como o do Jest
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    vi.stubGlobal("jest", { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) })
    try {
      const pessoa = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
      const escolherNaHora = async (descricao: string, opcao: string) => {
        await pessoa.click(within(janela).getByRole("combobox", { name: `Parte de ${descricao}` }))
        await pessoa.click(await screen.findByRole("option", { name: opcao }))
      }
      await escolherNaHora("Mercado", "Dispensáveis")
      await escolherNaHora("Guardar para a viagem", "Não descontar")
      expect(chamadasDaPrevia()).toHaveLength(2)

      await act(() => vi.advanceTimersByTimeAsync(299))
      expect(chamadasDaPrevia()).toHaveLength(2)
      await act(() => vi.advanceTimersByTimeAsync(1))
      expect(chamadasDaPrevia()).toHaveLength(3)
      // A resposta da prévia chega numa tarefa própria, também no relógio falso
      await act(() => vi.advanceTimersByTimeAsync(10))
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }

    await vi.waitFor(() => expect(parteNaRevisao(janela, "Dispensáveis")).toHaveTextContent("Já gasto R$ 130,00"))
    expect(chamadasDaPrevia()).toHaveLength(3)
    expect(chamadasDaPrevia()[2]).toEqual({ receipt: "rec-1", outflows: { "s-1": "p-dis", "s-2": null, "s-3": null } })
  })

  it("a parte que passou do valor avisa quanto passou e fica sem transação", async () => {
    const janela = await abrirRevisao()
    await vi.waitFor(() => expect(chamadasDaPrevia()).toHaveLength(2))

    await escolher(janela, "Fatura de setembro", "Guardar")

    await vi.waitFor(() =>
      expect(within(parteNaRevisao(janela, "Guardar")).getByRole("status")).toHaveTextContent("Passou R$ 150,00 do valor da parte"),
    )
    const ficam = within(janela).getByRole("list", { name: "Partes que ficam na conta do salário" })
    // Sem transação, a parte não diz "Transferir": mostra o que resta dela
    expect(within(ficam).getByRole("listitem", { name: "Guardar" })).toHaveTextContent("Resta R$ 0,00")
    expect(within(ficam).getByRole("listitem", { name: "Guardar" })).not.toHaveTextContent("Transferir")
    expect(within(ficam).getByRole("listitem", { name: "Dispensáveis" })).toHaveTextContent("Fica na conta R$ 900,00")
    expect(within(janela).queryByRole("list", { name: "Lançamentos que serão criados" })).not.toBeInTheDocument()
    // SALARIO-73: sem transferência, mas com saídas descontadas, a divisão ainda pode ser gravada
    expect(within(janela).getByText("Nenhuma transferência a fazer: as saídas já cobriram as partes.")).toBeInTheDocument()
    expect(botaoGerar()).toHaveTextContent("Gerar a divisão sem transferências")
    expect(botaoGerar()).toBeDisabled()
    await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo a divisão com as saídas descontadas" }))
    expect(botaoGerar()).toBeEnabled()
  })

  it("a divisão sem transferências mostra que as saídas cobriram as partes e o que foi descontado", async () => {
    const semTransacoes = divisao({
      transactions: [],
      total: "0.00",
      free: "2120.00",
      outflows: [
        { id: "s-1", date: "2026-10-06", description: "Mercado", amount: "130.00", type: "EXPENSE", part_name: "Essenciais" },
        { id: "s-2", date: "2026-10-07", description: "Guardar para a viagem", amount: "100.00", type: "TRANSFER_OUT", part_name: "Guardar" },
        { id: "s-3", date: "2026-10-08", description: "Fatura de setembro", amount: "650.00", type: "INVOICE_PAYMENT", part_name: "Guardar" },
      ],
    })
    const anterior = post.getMockImplementation()!
    post.mockImplementation(((url: string, corpo: unknown) =>
      url === "/salary/divisions/" ? resposta(semTransacoes) : anterior(url, corpo)) as typeof api.post)
    const janela = await abrirRevisao()
    await vi.waitFor(() => expect(chamadasDaPrevia()).toHaveLength(2))
    await escolher(janela, "Fatura de setembro", "Guardar")
    await vi.waitFor(() => expect(botaoGerar()).toHaveTextContent("Gerar a divisão sem transferências"))

    await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo a divisão com as saídas descontadas" }))
    await userEvent.click(botaoGerar())

    expect(await within(janela).findByRole("heading", { name: "Divisão gerada" })).toBeInTheDocument()
    expect(janela).toHaveTextContent("Nenhuma transferência a fazer: as saídas já cobriram as partes.")
    expect(janela).toHaveTextContent("Descontou R$ 880,00 em 3 saídas.")
    expect(within(janela).queryByRole("list", { name: "Lançamentos criados" })).not.toBeInTheDocument()

    // O desfazer não fala em transações removidas
    await userEvent.click(within(janela).getByRole("button", { name: "Desfazer divisão" }))
    const confirmacao = await screen.findByRole("alertdialog")
    expect(confirmacao).toHaveTextContent("Esta divisão não criou lançamentos.")
    expect(confirmacao).toHaveTextContent("Descontou R$ 880,00 em 3 saídas.")
    expect(within(confirmacao).queryByRole("list", { name: "Lançamentos que serão removidos" })).not.toBeInTheDocument()
  })

  it("a geração envia as saídas escolhidas e o resultado mostra o desconto", async () => {
    const janela = await abrirRevisao()
    await vi.waitFor(() => expect(chamadasDaPrevia()).toHaveLength(2))
    await vi.waitFor(() => expect(within(janela).getByTestId("total-da-divisao")).toHaveTextContent("R$ 500,00"))

    await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo que fiz essas transferências no banco" }))
    await userEvent.click(botaoGerar())

    const criadas = await within(janela).findByRole("list", { name: "Lançamentos criados" })
    expect(criadas).toBeInTheDocument()
    const corpo = post.mock.calls.find(([url]) => url === "/salary/divisions/")![1]
    // SALARIO-74: com o total que a revisão mostrou
    expect(corpo).toEqual({ receipt: "rec-1", idempotency_key: expect.any(String), outflows: SUGERIDAS, expected_total: "500.00" })
    expect(janela).toHaveTextContent("Descontou R$ 230,00 em 2 saídas.")
  })

  it("quando as saídas passam do que sobra, o livre aparece negativo, sem ser zerado", async () => {
    // R$ 3.000,00 recebidos, R$ 600,00 para Guardar e R$ 2.900,00 de saídas: o livre fica em -R$ 500,00
    saidasDaConta = [saida({ id: "s-9", description: "Reforma", amount: "2900.00", suggested_part_id: "p-ess" })]
    const janela = await abrirRevisao()

    await vi.waitFor(() => expect(within(janela).getByTestId("gasto-da-divisao")).toHaveTextContent("R$ 2.900,00"))
    expect(within(janela).getByTestId("livre-da-divisao").textContent?.replace(/\s/g, " ")).toBe("-R$ 500,00")
  })

  it("sem saídas, mostra o aviso e não pede a prévia de novo", async () => {
    saidasDaConta = []
    const janela = await abrirRevisao()

    expect(within(janela).getByText("Nenhuma saída desde o salário.")).toBeInTheDocument()
    expect(within(janela).queryByRole("list", { name: "Saídas desde o salário" })).not.toBeInTheDocument()
    expect(chamadasDaPrevia()).toEqual([{ receipt: "rec-1" }])
    expect(within(janela).getByTestId("gasto-da-divisao")).toHaveTextContent("R$ 0,00")
  })

  it("com mais de 6 saídas, mostra 6 e \"Mostrar todas (N)\"", async () => {
    saidasDaConta = Array.from({ length: 8 }, (_, i) => saida({ id: `s-${i + 1}`, description: `Compra ${i + 1}`, amount: "10.00" }))
    const janela = await abrirRevisao()
    const lista = within(janela).getByRole("list", { name: "Saídas desde o salário" })

    expect(within(lista).getAllByRole("listitem")).toHaveLength(6)
    const alternar = within(janela).getByRole("button", { name: "Mostrar todas (8)" })
    expect(alternar).toHaveAttribute("aria-expanded", "false")

    await userEvent.click(alternar)
    expect(within(lista).getAllByRole("listitem")).toHaveLength(8)
    expect(within(janela).getByRole("button", { name: "Mostrar menos" })).toHaveAttribute("aria-expanded", "true")
  })
})
