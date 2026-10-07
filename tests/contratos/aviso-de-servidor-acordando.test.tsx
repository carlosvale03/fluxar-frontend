import { act, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ServerWakeupOverlay } from "@/components/ui/server-wakeup-overlay"
import { serverStatusManager } from "@/services/serverStatus"

// CONTRATO-35: o aviso de "servidor acordando" pode ser fechado e não volta
// até o fim do episódio (as requisições ativas voltarem a zero).

const TITULO = "Estamos acordando o servidor..."

// Sem a animação de saída no jsdom: o aviso sai da tela assim que fecha
vi.mock("framer-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("framer-motion")>()),
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}))


function esperar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe("Aviso de servidor acordando", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      ;["r1", "r2", "r3"].forEach((id) => serverStatusManager.endRequest(id))
    })
    vi.useRealTimers()
  })

  it("fecha pelo botão e não volta no mesmo episódio; volta no episódio seguinte", async () => {
    render(<ServerWakeupOverlay />)

    act(() => serverStatusManager.startRequest("r1"))
    esperar(5000)
    expect(screen.getByText(TITULO)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }))
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument()

    // Outra requisição lenta no mesmo episódio
    act(() => serverStatusManager.startRequest("r2"))
    esperar(6000)
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument()

    // Fim do episódio e um novo
    act(() => {
      serverStatusManager.endRequest("r1")
      serverStatusManager.endRequest("r2")
    })
    act(() => serverStatusManager.startRequest("r3"))
    esperar(5000)
    expect(screen.getByText(TITULO)).toBeInTheDocument()
  })
})
