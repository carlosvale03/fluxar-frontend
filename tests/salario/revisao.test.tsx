import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { PlanoDoSalario, RevisaoDaDivisao } from "@/types/salario"

import { usuario } from "../permissoes/acesso"
import {
  CATEGORIAS_DE_RECEITA,
  CONTAS,
  METAS,
  MODELOS,
  PLANO_SALVO,
  SEM_PLANO,
  divisao,
  recebimento,
  referencias,
  resposta,
  revisao,
} from "./dados"

// SALARIO-21, SALARIO-22: /salario?dividir=<id> abre a revisão ou, sem plano,
// a escolha do modelo. SALARIO-29 a SALARIO-31: revisão com origem, destino,
// valor e data, ajuste, confirmação forte e botão com quantidade e total.
// SALARIO-37: chave da tentativa. SALARIO-44: transações criadas e desfazer.

const auth = vi.hoisted(() => ({ user: null as User | null }))
const navegacao = vi.hoisted(() => ({ replace: vi.fn(), params: new URLSearchParams() }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() })

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: navegacao.replace }),
  usePathname: () => "/salario",
  useSearchParams: () => navegacao.params,
}))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const put = vi.mocked(api.put)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function comPlano(plano: PlanoDoSalario) {
  const dados: Record<string, unknown> = {
    "/salary/pending/": [recebimento()],
    "/salary/references/": referencias(),
    "/salary/plan/": plano,
    "/salary/models/": MODELOS,
    "/accounts/": CONTAS,
    "/goals/": METAS,
    "/categories/": CATEGORIAS_DE_RECEITA,
  }
  get.mockImplementation(((url: string) => resposta(dados[url] ?? [])) as typeof api.get)
}

// Respostas do POST por rota; `geracao` pode falhar antes de dar certo
function comRespostasDoPost({ previa = revisao(), geracao }: { previa?: RevisaoDaDivisao; geracao?: () => Promise<unknown> } = {}) {
  post.mockImplementation(((url: string, corpo: { adjustments?: Record<string, string> }) => {
    if (url === "/salary/divisions/preview/") {
      if (corpo?.adjustments?.["p-gua"] === "450.00") {
        return resposta(
          revisao({
            items: revisao().items.map((item) =>
              item.part_id === "p-gua" ? { ...item, amount: "450.00", adjusted: true } : item,
            ),
            total: "450.00",
            free: "2550.00",
          }),
        )
      }
      return resposta(previa)
    }
    if (url === "/salary/divisions/") return geracao ? geracao() : resposta(divisao())
    return resposta({})
  }) as typeof api.post)
}

const dialogo = () => screen.findByRole("dialog")
const botaoGerar = () => screen.getByRole("button", { name: /^Gerar/ })
const chaveDaGeracao = (n: number) =>
  (post.mock.calls.filter(([url]) => url === "/salary/divisions/")[n][1] as { idempotency_key: string }).idempotency_key

async function abrirRevisao() {
  render(<SalarioPage />)
  const lista = await screen.findByRole("list", { name: "Salários a dividir" })
  // Espera o plano chegar, para o botão saber se abre a revisão
  await screen.findByRole("region", { name: "Plano de divisão" })
  await userEvent.click(within(lista).getByRole("button", { name: /Dividir/ }))
  return dialogo()
}

beforeEach(() => {
  vi.clearAllMocks()
  navegacao.params = new URLSearchParams()
  auth.user = usuario()
  comPlano(PLANO_SALVO)
  comRespostasDoPost()
})

// A página inteira é pesada no jsdom quando a suíte roda em paralelo
describe("Revisão e geração da divisão", { timeout: 15000 }, () => {
  it("mostra cada transação com origem, destino, valor e data, o total e o livre", async () => {
    const janela = await abrirRevisao()

    const transacoes = await within(janela).findByRole("list", { name: "Transações que serão criadas" })
    const guardar = within(transacoes).getByRole("listitem", { name: "Guardar" })
    expect(guardar).toHaveTextContent("Banco Azul")
    expect(guardar).toHaveTextContent("Viagem")
    expect(guardar).toHaveTextContent("R$ 600,00")
    expect(guardar).toHaveTextContent("10/10/2026")
    expect(within(janela).getByRole("list", { name: "Partes que ficam na conta do salário" })).toHaveTextContent("Essenciais")
    expect(within(janela).getByTestId("total-da-divisao")).toHaveTextContent("R$ 600,00")
    expect(within(janela).getByTestId("livre-da-divisao")).toHaveTextContent("R$ 2.400,00")
    expect(post).toHaveBeenCalledWith("/salary/divisions/preview/", { receipt: "rec-1" })
  })

  it("o botão fica desabilitado até a marcação e diz \"Gerar 1 transação de R$ 600,00\"", async () => {
    const janela = await abrirRevisao()
    await within(janela).findByRole("list", { name: "Transações que serão criadas" })

    expect(botaoGerar().textContent?.replace(/\s/g, " ")).toBe("Gerar 1 transação de R$ 600,00")
    expect(botaoGerar()).toBeDisabled()
    await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo que fiz essas transferências no banco" }))
    expect(botaoGerar()).toBeEnabled()
  })

  it("com duas transações, o botão usa o plural, e a parte reduzida aparece marcada", async () => {
    const origem = { id: "conta-salario", name: "Banco Azul" }
    comRespostasDoPost({
      previa: revisao({
        items: [
          { part_id: "p-a", name: "Reserva", destination_type: "ACCOUNT", destination_name: "Reserva", amount: "700.00", reduced: false, adjusted: false, generates_transaction: true, origin_account: origem },
          { part_id: "p-b", name: "Viagem", destination_type: "GOAL", destination_name: "Viagem", amount: "500.00", reduced: true, adjusted: false, generates_transaction: true, origin_account: origem },
        ],
        total: "1200.00",
        free: "0.00",
      }),
    })
    const janela = await abrirRevisao()
    const transacoes = await within(janela).findByRole("list", { name: "Transações que serão criadas" })

    expect(botaoGerar().textContent?.replace(/\s/g, " ")).toBe("Gerar 2 transações de R$ 1.200,00")
    expect(within(transacoes).getByRole("listitem", { name: "Viagem" })).toHaveTextContent("Reduzida")
    expect(within(transacoes).getByRole("listitem", { name: "Reserva" })).not.toHaveTextContent("Reduzida")
  })

  it("ajustar uma parte recalcula o total e envia o ajuste na geração", async () => {
    const janela = await abrirRevisao()
    await within(janela).findByRole("list", { name: "Transações que serão criadas" })

    const ajuste = within(janela).getByLabelText("Ajustar Guardar")
    await userEvent.clear(ajuste)
    await userEvent.type(ajuste, "450")
    await userEvent.tab()

    await vi.waitFor(() => expect(within(janela).getByTestId("total-da-divisao")).toHaveTextContent("R$ 450,00"))
    expect(within(janela).getByTestId("livre-da-divisao")).toHaveTextContent("R$ 2.550,00")
    expect(post).toHaveBeenCalledWith("/salary/divisions/preview/", { receipt: "rec-1", adjustments: { "p-gua": "450.00" } })

    await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo que fiz essas transferências no banco" }))
    await userEvent.click(botaoGerar())
    await vi.waitFor(() => expect(post.mock.calls.some(([url]) => url === "/salary/divisions/")).toBe(true))
    const corpo = post.mock.calls.find(([url]) => url === "/salary/divisions/")![1]
    expect(corpo).toMatchObject({ receipt: "rec-1", adjustments: { "p-gua": "450.00" } })
  })

  it("repetir depois de um erro de rede envia a mesma chave; reabrir gera outra", async () => {
    let tentativas = 0
    comRespostasDoPost({
      geracao: () => {
        tentativas += 1
        return tentativas === 1
          ? Promise.reject(Object.assign(new Error("timeout of 30000ms exceeded"), { code: "ECONNABORTED" }))
          : Promise.reject({ response: { status: 400, data: { detail: "Este salário já foi dividido." } } })
      },
    })
    let janela = await abrirRevisao()
    await within(janela).findByRole("list", { name: "Transações que serão criadas" })
    await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo que fiz essas transferências no banco" }))

    await userEvent.click(botaoGerar())
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(botaoGerar()).toBeEnabled())
    await userEvent.click(botaoGerar())
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Este salário já foi dividido."))

    expect(chaveDaGeracao(0)).toMatch(UUID)
    expect(chaveDaGeracao(1)).toBe(chaveDaGeracao(0))

    await userEvent.keyboard("{Escape}")
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: /Dividir/ }))
    janela = await dialogo()
    await within(janela).findByRole("list", { name: "Transações que serão criadas" })
    await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo que fiz essas transferências no banco" }))
    await userEvent.click(botaoGerar())

    await vi.waitFor(() => expect(post.mock.calls.filter(([url]) => url === "/salary/divisions/")).toHaveLength(3))
    expect(chaveDaGeracao(2)).toMatch(UUID)
    expect(chaveDaGeracao(2)).not.toBe(chaveDaGeracao(0))
  })

  it("depois da geração, mostra as transações criadas e \"Desfazer divisão\", e atualiza os salários a dividir", async () => {
    const janela = await abrirRevisao()
    await within(janela).findByRole("list", { name: "Transações que serão criadas" })
    await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo que fiz essas transferências no banco" }))
    await userEvent.click(botaoGerar())

    const criadas = await within(janela).findByRole("list", { name: "Transações criadas" })
    expect(criadas).toHaveTextContent("Aporte: Guardar")
    expect(criadas).toHaveTextContent("Banco Azul")
    expect(criadas).toHaveTextContent("Viagem")
    expect(criadas).toHaveTextContent("R$ 600,00")
    expect(within(janela).getByRole("button", { name: "Desfazer divisão" })).toBeInTheDocument()
    expect(within(janela).getByRole("heading", { name: "Divisão gerada" })).toBeInTheDocument()
    await vi.waitFor(() => expect(get.mock.calls.filter(([url]) => url === "/salary/pending/")).toHaveLength(2))
  })

  it("/salario?dividir=<id> com plano abre a revisão daquele salário", async () => {
    navegacao.params = new URLSearchParams("dividir=rec-9")
    render(<SalarioPage />)

    const janela = await dialogo()
    expect(within(janela).getByRole("heading", { name: "Revisar a divisão" })).toBeInTheDocument()
    await vi.waitFor(() => expect(post).toHaveBeenCalledWith("/salary/divisions/preview/", { receipt: "rec-9" }))

    await userEvent.keyboard("{Escape}")
    await vi.waitFor(() => expect(navegacao.replace).toHaveBeenCalledWith("/salario"))
  })

  it("/salario?dividir=<id> sem plano abre a escolha do modelo e, salvo o plano, a revisão", async () => {
    navegacao.params = new URLSearchParams("dividir=rec-9")
    comPlano(SEM_PLANO)
    put.mockImplementation((() => resposta(PLANO_SALVO)) as typeof api.put)
    render(<SalarioPage />)

    expect(await screen.findByRole("region", { name: "Escolha do modelo" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Escolha um modelo e salve o seu plano.")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.click(await screen.findByRole("button", { name: "Usar o modelo 50/30/20" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    const janela = await dialogo()
    expect(within(janela).getByRole("heading", { name: "Revisar a divisão" })).toBeInTheDocument()
    await vi.waitFor(() => expect(post).toHaveBeenCalledWith("/salary/divisions/preview/", { receipt: "rec-9" }))
  })
})
