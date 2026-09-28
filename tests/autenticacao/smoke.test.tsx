import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AuthShell } from "@/components/auth/auth-shell"

describe("AuthShell", () => {
  it("renderiza o título e o conteúdo recebidos", () => {
    render(
      <AuthShell title="Entrar no Fluxar" description="Use seu e-mail e senha">
        <p>conteúdo do formulário</p>
      </AuthShell>
    )

    expect(screen.getByRole("heading", { level: 1, name: "Entrar no Fluxar" })).toBeInTheDocument()
    expect(screen.getByText("Use seu e-mail e senha")).toBeInTheDocument()
    expect(screen.getByText("conteúdo do formulário")).toBeInTheDocument()
  })
})
