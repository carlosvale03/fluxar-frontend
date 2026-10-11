import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SalariosADividir } from "@/components/salario/SalariosADividir"
import { Badge } from "@/components/ui/badge"

import { recebimento } from "./dados"

// O selo vira <span>: um <div> dentro de <p> quebra o HTML e dá erro de
// hidratação no Next.js

describe("Selo", () => {
  it("renderiza um span, que pode ficar dentro de um parágrafo", () => {
    render(
      <p>
        <Badge variant="outline">Importado</Badge>
      </p>,
    )

    expect(screen.getByText("Importado").tagName).toBe("SPAN")
  })

  it("o salário importado mostra o selo sem nenhum div dentro de parágrafo", () => {
    const { container } = render(
      <SalariosADividir recebimentos={[recebimento({ imported: true })]} onDividir={vi.fn()} />,
    )

    expect(screen.getByText("Importado").tagName).toBe("SPAN")
    expect(container.querySelector("p div")).toBeNull()
  })
})
