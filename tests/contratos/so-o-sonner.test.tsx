import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError, type AxiosResponse } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TagForm } from "@/components/tags/TagForm"
import { createTag } from "@/services/tags"

// CONTRATO-32: o Sonner é o único sistema de avisos (AD-042).

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/services/tags", () => ({ createTag: vi.fn(), updateTag: vi.fn() }))

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

function erroHttp(status: number, data: unknown) {
  const response = { data, status, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

async function salvarTag(nome: string) {
  render(<TagForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText(/Urgente, Viagem/), nome)
  await userEvent.click(screen.getByRole("button", { name: /criar tag premium/i }))
}

describe("Só o Sonner", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(createTag).mockReset()
  })

  it("nenhum arquivo importa useToast nem o Toaster do Radix", () => {
    const fontes = arquivos(path.resolve(__dirname, "../../src")).filter((f) => /\.tsx?$/.test(f))
    const comToastAntigo = fontes.filter((f) =>
      /useToast|@\/components\/ui\/(toaster|use-toast|toast)["']/.test(readFileSync(f, "utf-8")),
    )

    expect(comToastAntigo).toEqual([])
  })

  it("salvar uma tag com erro mostra o aviso do Sonner com a mensagem do backend", async () => {
    // Erro que não é de um campo do formulário (CONTRATO-30: o erro de campo
    // vai para o campo; o que sobra, como non_field_errors, vai ao Sonner)
    vi.mocked(createTag).mockRejectedValue(erroHttp(400, { non_field_errors: ["Já existe uma tag com este nome."] }))

    await salvarTag("Viagem")

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Já existe uma tag com este nome."))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("salvar uma tag com sucesso mostra o aviso de sucesso do Sonner", async () => {
    vi.mocked(createTag).mockResolvedValue({ id: "tag-1", name: "Viagem", color: "#6366f1" } as never)

    await salvarTag("Viagem")

    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Tag criada com sucesso!"))
    expect(toast.error).not.toHaveBeenCalled()
  })
})
