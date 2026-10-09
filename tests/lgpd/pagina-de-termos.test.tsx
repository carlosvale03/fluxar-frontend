import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import TermsPage from "@/app/termos/page"
import { api } from "@/services/apiClient"

// LGPD-28 e LGPD-31: a página mostra a versão e a data vigentes da API, as
// finalidades (com a melhoria do produto e o treino de modelos, opcionais) e
// os serviços que tratam os dados.
// LGPD-32: a segurança descreve só o que o app faz, sem ponta a ponta.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const get = vi.mocked(api.get)

const TERMOS = {
  version: "2.0",
  effective_date: "2026-10-09",
  changes: ["Os termos passam a ter versão."],
  services: [
    { name: "Render", purpose: "Hospedagem da API e do banco de dados" },
    { name: "Vercel", purpose: "Hospedagem do site" },
    { name: "Resend", purpose: "Envio de e-mails" },
    { name: "Brevo", purpose: "Envio de e-mails (alternativo)" },
    { name: "Cloudinary", purpose: "Guarda das imagens (foto de perfil e imagens das metas)" },
  ],
}

describe("Página de termos e política", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: TERMOS })
  })

  it("mostra a versão e a data de vigência vindas da API", async () => {
    render(<TermsPage />)

    expect(await screen.findByText(/Versão 2\.0, em vigor desde 9 de outubro de 2026/)).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("/terms/")
  })

  it("as finalidades citam a melhoria do produto e o treino de modelos, opcionais", async () => {
    const { container } = render(<TermsPage />)
    await screen.findByText(/Versão 2\.0/)

    const texto = container.textContent ?? ""
    expect(texto).toMatch(/melhorar o produto/i)
    expect(texto).toMatch(/treinar modelos de previsão e de categorização/i)
    expect(texto).toMatch(/opcional/i)
  })

  it("lista os serviços de hospedagem da API e do banco, do site, de e-mail e de imagens", async () => {
    render(<TermsPage />)

    for (const servico of TERMOS.services) {
      expect(await screen.findByText(servico.name)).toBeInTheDocument()
      expect(screen.getByText(servico.purpose)).toBeInTheDocument()
    }
  })

  it("a segurança não promete ponta a ponta e cita só a conexão e os dados pessoais criptografados", async () => {
    const { container } = render(<TermsPage />)
    await screen.findByText(/Versão 2\.0/)

    const texto = container.textContent ?? ""
    expect(texto).not.toMatch(/ponta a ponta/i)
    expect(texto).toMatch(/conexão .* criptografada/i)
    expect(texto).toMatch(/criptografados no banco/i)
  })

  it("o download dos dados vale para todos os planos", async () => {
    const { container } = render(<TermsPage />)
    await screen.findByText(/Versão 2\.0/)

    expect(container.textContent).toMatch(/em qualquer plano, você baixa os seus dados/i)
  })
})
