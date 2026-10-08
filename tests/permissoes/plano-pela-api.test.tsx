import { render, renderHook, screen } from "@testing-library/react"
import { AxiosError, type AxiosResponse } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import type { User } from "@/contexts/auth-context"
import { usePlan } from "@/hooks/use-plan"
import { registrarAcoesDePlano, tratarErro } from "@/lib/erros"

import { usuario } from "./acesso"

// PERM-18: a interface decide só pelo `access` do /auth/me. PERM-19: recurso
// fechado mostra o aviso e o link para os planos no lugar do conteúdo.
// PERM-20: no limite, mostra o uso e o limite e desabilita a criação.
// PERM-15 e PERM-16: o 403 de plano mostra o aviso com "Ver planos" e relê o acesso.

const auth = vi.hoisted(() => ({ user: null as User | null }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const erro = vi.mocked(toast.error)

function erroHttp(status: number, data: unknown) {
  const response = { data, status, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

describe("usePlan", () => {
  it("podeUsar segue access.features, e o plano vem do access, não do plano fixo", () => {
    auth.user = usuario({ fechados: ["metas"], plan: "PREMIUM_PLUS" })
    const { result, rerender } = renderHook(() => usePlan())

    expect(result.current.podeUsar("metas")).toBe(false)
    expect(result.current.podeUsar("tags")).toBe(true)
    expect(result.current.plano).toBe("PREMIUM_PLUS")
    expect(result.current.nomeDoPlano).toBe("Premium Plus")

    auth.user = usuario({ plan: "COMMON", testing_unlock: true })
    rerender()
    expect(result.current.podeUsar("metas")).toBe(true)
    expect(result.current.nomeDoPlano).toBe("Comum")
    expect(result.current.liberacaoDeTestes).toBe(true)
    expect(result.current.ehAdmin).toBe(false)
  })

  it("sem o access carregado, nada é liberado nem bloqueado", () => {
    auth.user = usuario({}, true)
    const { result } = renderHook(() => usePlan())

    expect(result.current.carregado).toBe(false)
    expect(result.current.podeUsar("metas")).toBeNull()
    expect(result.current.limite("limite_contas")).toBeNull()
    expect(result.current.limiteAtingido("limite_contas")).toBe(false)
  })

  it("limite devolve o valor e o uso informados pela API", () => {
    auth.user = usuario({ limites: { limite_contas: { limit: 2, used: 1 } } })
    const { result } = renderHook(() => usePlan())

    expect(result.current.limite("limite_contas")).toEqual({ limit: 2, used: 1 })
    expect(result.current.limiteAtingido("limite_contas")).toBe(false)
    expect(result.current.limiteAtingido("limite_contas", 2)).toBe(true)
  })
})

describe("RecursoBloqueado", () => {
  it("com o recurso fechado, mostra o aviso e o link para /planos sem montar o conteúdo", () => {
    auth.user = usuario({ fechados: ["calendario"] })
    render(
      <RecursoBloqueado chave="calendario" titulo="Calendário">
        <p>conteúdo do calendário</p>
      </RecursoBloqueado>,
    )

    expect(screen.queryByText("conteúdo do calendário")).not.toBeInTheDocument()
    expect(screen.getByText("Este recurso não está disponível no seu plano.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
  })

  it("no modo compacto, mostra o aviso de uma linha com o link", () => {
    auth.user = usuario({ fechados: ["exportacao_pdf"] })
    render(
      <RecursoBloqueado chave="exportacao_pdf" compacto>
        <button>Exportar PDF</button>
      </RecursoBloqueado>,
    )

    expect(screen.queryByRole("button", { name: "Exportar PDF" })).not.toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent("Este recurso não está disponível no seu plano.")
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
  })

  it("com o recurso aberto mostra o conteúdo, e sem o access não mostra nada", () => {
    auth.user = usuario()
    const { rerender } = render(
      <RecursoBloqueado chave="calendario">
        <p>conteúdo do calendário</p>
      </RecursoBloqueado>,
    )
    expect(screen.getByText("conteúdo do calendário")).toBeInTheDocument()
    expect(screen.queryByRole("note")).not.toBeInTheDocument()

    auth.user = usuario({}, true)
    rerender(
      <RecursoBloqueado chave="calendario">
        <p>conteúdo do calendário</p>
      </RecursoBloqueado>,
    )
    expect(screen.queryByText("conteúdo do calendário")).not.toBeInTheDocument()
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })
})

function TelaDeContas() {
  const { limiteAtingido } = usePlan()
  return (
    <>
      <AvisoDeLimite chave="limite_contas" rotulo="contas" />
      <button disabled={limiteAtingido("limite_contas")}>Nova conta</button>
    </>
  )
}

describe("AvisoDeLimite", () => {
  it("no limite, mostra o uso e o limite, o link para os planos, e a criação fica desabilitada", () => {
    auth.user = usuario({ limites: { limite_contas: { limit: 2, used: 2 } } })
    render(<TelaDeContas />)

    expect(screen.getByRole("note")).toHaveTextContent("Você atingiu o limite do seu plano.")
    expect(screen.getByRole("note")).toHaveTextContent("2 de 2 contas")
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
    expect(screen.getByRole("button", { name: "Nova conta" })).toBeDisabled()
  })

  it("abaixo do limite mostra o uso e deixa criar; sem limite não mostra nada", () => {
    auth.user = usuario({ limites: { limite_contas: { limit: 2, used: 1 } } })
    const { rerender } = render(<TelaDeContas />)
    expect(screen.getByText("1 de 2 contas do seu plano")).toBeInTheDocument()
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Nova conta" })).toBeEnabled()

    auth.user = usuario({ limites: { limite_contas: { limit: null, used: 7 } } })
    rerender(<TelaDeContas />)
    expect(screen.queryByText(/de .* contas/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Nova conta" })).toBeEnabled()
  })
})

describe("tratarErro com 403 de plano", () => {
  beforeEach(() => {
    erro.mockReset()
  })

  it.each([
    ["plan_locked", { detail: "Este recurso não está disponível no seu plano.", code: "plan_locked", feature: "metas" }],
    [
      "plan_limit_reached",
      { detail: "Você atingiu o limite do seu plano.", code: "plan_limit_reached", feature: "limite_contas", limit: 2 },
    ],
  ])("%s mostra o detail com \"Ver planos\", que abre os planos, e relê o /auth/me", (_, corpo) => {
    const acoes = { reler: vi.fn(), abrirPlanos: vi.fn() }
    const cancelar = registrarAcoesDePlano(acoes)

    tratarErro(erroHttp(403, corpo))

    expect(erro).toHaveBeenCalledTimes(1)
    const [mensagem, opcoes] = erro.mock.calls[0] as [string, { action: { label: string; onClick: () => void } }]
    expect(mensagem).toBe(corpo.detail)
    expect(opcoes.action.label).toBe("Ver planos")
    expect(acoes.reler).toHaveBeenCalledTimes(1)
    expect(acoes.abrirPlanos).not.toHaveBeenCalled()
    opcoes.action.onClick()
    expect(acoes.abrirPlanos).toHaveBeenCalledTimes(1)
    cancelar()
  })

  it("um 403 sem código de plano continua só com o detail, sem reler o acesso", () => {
    const acoes = { reler: vi.fn(), abrirPlanos: vi.fn() }
    const cancelar = registrarAcoesDePlano(acoes)

    tratarErro(erroHttp(403, { detail: "Você não tem permissão para executar essa ação." }))

    expect(erro).toHaveBeenCalledWith("Você não tem permissão para executar essa ação.")
    expect(acoes.reler).not.toHaveBeenCalled()
    cancelar()
  })
})
