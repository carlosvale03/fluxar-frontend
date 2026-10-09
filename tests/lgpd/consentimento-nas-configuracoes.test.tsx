import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SettingsPage from "@/app/(app)/configuracoes/page"
import { api } from "@/services/apiClient"

// LGPD-34: as configurações de privacidade mostram se o consentimento está
// dado e permitem dá-lo ou retirá-lo a qualquer momento.
// LGPD-35: cada decisão é gravada pela API, com a data.

const { usuario, refreshUser } = vi.hoisted(() => ({
  usuario: { atual: {} as Record<string, unknown> },
  refreshUser: vi.fn(),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: usuario.atual, refreshUser, logout: vi.fn() }),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: vi.fn() }) }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const get = vi.mocked(api.get)
const put = vi.mocked(api.put)

function comConsentimento(consentiu: boolean) {
  usuario.atual = {
    id: "1",
    name: "Ana",
    email: "ana@x.com",
    role: "USER",
    plan: "COMMON",
    preferences: { currency: "BRL", language: "pt-BR", theme: "light", notifications: {} },
    product_improvement_consent: consentiu,
  }
}

async function abrirPrivacidade() {
  render(<SettingsPage />)
  await userEvent.click(screen.getByRole("button", { name: "Privacidade" }))
  return screen.findByRole("switch", { name: /melhorar o produto/i })
}

describe("Consentimento nas configurações", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // O histórico ainda não respondeu: vale o estado do /auth/me
    get.mockReturnValue(new Promise(() => {}))
  })

  it.each([true, false])("o interruptor mostra o product_improvement_consent do usuário (%s)", async (consentiu) => {
    comConsentimento(consentiu)

    const interruptor = await abrirPrivacidade()

    expect(interruptor).toHaveAttribute("aria-checked", String(consentiu))
  })

  it("ligar chama PUT /users/me/consent/ com consent true e mostra a data da decisão", async () => {
    comConsentimento(false)
    put.mockResolvedValueOnce({ data: { consent: true, decided_at: "2026-10-09T15:00:00Z", policy_version: "2.0" } })

    const interruptor = await abrirPrivacidade()
    await userEvent.click(interruptor)

    expect(put).toHaveBeenCalledWith("/users/me/consent/", { consent: true })
    await waitFor(() => expect(interruptor).toHaveAttribute("aria-checked", "true"))
    expect(await screen.findByText(/Última decisão em 09\/10\/2026/)).toBeInTheDocument()
  })

  it("desligar chama PUT /users/me/consent/ com consent false", async () => {
    comConsentimento(true)
    put.mockResolvedValueOnce({ data: { consent: false, decided_at: "2026-10-09T15:00:00Z", policy_version: "2.0" } })

    const interruptor = await abrirPrivacidade()
    await userEvent.click(interruptor)

    expect(put).toHaveBeenCalledWith("/users/me/consent/", { consent: false })
    await waitFor(() => expect(interruptor).toHaveAttribute("aria-checked", "false"))
  })

  it("com a gravação recusada, o interruptor volta ao estado anterior", async () => {
    comConsentimento(false)
    put.mockRejectedValueOnce({ response: { status: 400, data: { consent: ["Informe true ou false."] } } })

    const interruptor = await abrirPrivacidade()
    await userEvent.click(interruptor)

    await waitFor(() => expect(interruptor).toHaveAttribute("aria-checked", "false"))
  })
})
