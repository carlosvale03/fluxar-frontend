import { act, render, screen } from "@testing-library/react"
import { AxiosError, type AxiosResponse } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthProvider } from "@/contexts/auth-context"
import { usePlan } from "@/hooks/use-plan"
import { tratarErro } from "@/lib/erros"
import { api } from "@/services/apiClient"

import { usuario } from "./acesso"

// PERM-11 e PERM-24: uma trava mudada no painel chega à tela quando a aba
// volta a ficar visível ou quando a API recusa algo pelo plano (403 de plano).

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/sessao-entre-abas", () => ({
  renovarSessao: () => Promise.resolve("acesso-1"),
  anunciarFimDaSessao: vi.fn(),
  aoFimDaSessao: () => () => undefined,
}))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))

const get = vi.mocked(api.get)

function Metas() {
  const { podeUsar } = usePlan()
  const metas = podeUsar("metas")
  return <p>{metas === null ? "carregando" : metas ? "metas liberadas" : "metas travadas"}</p>
}

function erroDePlano() {
  const data = { detail: "Este recurso não está disponível no seu plano.", code: "plan_locked", feature: "metas" }
  const response = { data, status: 403, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

function definirVisibilidade(estado: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => estado })
  document.dispatchEvent(new Event("visibilitychange"))
}

describe("releitura do acesso", () => {
  beforeEach(() => {
    push.mockReset()
    get.mockReset()
    get.mockResolvedValueOnce({ data: usuario() })
  })

  it("relê o /auth/me quando a aba volta a ficar visível, e a tela passa a mostrar a trava", async () => {
    render(
      <AuthProvider>
        <Metas />
      </AuthProvider>,
    )
    expect(await screen.findByText("metas liberadas")).toBeInTheDocument()

    get.mockResolvedValueOnce({ data: usuario({ fechados: ["metas"] }) })
    await act(async () => definirVisibilidade("hidden"))
    expect(get).toHaveBeenCalledTimes(1)
    await act(async () => definirVisibilidade("visible"))

    expect(await screen.findByText("metas travadas")).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenLastCalledWith("/auth/me/")
  })

  it("um 403 de plano relê o /auth/me, e \"Ver planos\" leva a /planos", async () => {
    render(
      <AuthProvider>
        <Metas />
      </AuthProvider>,
    )
    expect(await screen.findByText("metas liberadas")).toBeInTheDocument()

    get.mockResolvedValueOnce({ data: usuario({ fechados: ["metas"] }) })
    await act(async () => tratarErro(erroDePlano()))

    expect(await screen.findByText("metas travadas")).toBeInTheDocument()
    const [, opcoes] = vi.mocked(toast.error).mock.calls.at(-1) as unknown as [string, { action: { onClick: () => void } }]
    opcoes.action.onClick()
    expect(push).toHaveBeenCalledWith("/planos")
  })
})
