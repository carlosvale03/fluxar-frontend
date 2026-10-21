import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Valor, Variacao } from "@/components/ui/valor"

// AZ-44: o valor mostra o sinal em texto, além da cor da direção
describe("Valor", () => {
  it("valor positivo sem direção vira entrada, com sinal de mais", () => {
    render(<Valor valor="1234.5" />)
    const valor = screen.getByText(/1\.234,50/)
    expect(valor).toHaveTextContent(/^\+ R\$\s1\.234,50$/)
    expect(valor).toHaveClass("text-inflow")
  })

  it("valor negativo sem direção vira saída, com o sinal de menos e sem o sinal duplicado", () => {
    render(<Valor valor="-412.37" />)
    const valor = screen.getByText(/412,37/)
    expect(valor).toHaveTextContent(/^− R\$\s412,37$/)
    expect(valor).toHaveClass("text-outflow")
  })

  it("a direção informada vale mais que o sinal, e semMoeda tira o R$", () => {
    render(<Valor valor="500" direcao="transferencia" semMoeda />)
    expect(screen.getByText("→ 500,00")).toHaveClass("text-foreground")
  })
})

describe("Variacao", () => {
  it("subida boa fica verde e diz em texto que subiu", () => {
    render(<Variacao percentual={2.14} referencia="vs setembro" />)
    expect(screen.getByText(/2,1%/)).toHaveClass("text-inflow")
    expect(screen.getByText(/Subiu/)).toBeInTheDocument()
    expect(screen.getByText(/vs setembro/)).toBeInTheDocument()
  })

  it("para gastos, subir é ruim e fica vermelho", () => {
    render(<Variacao percentual={18} subirEBom={false} />)
    expect(screen.getByText(/18%/)).toHaveClass("text-outflow")
  })

  it("sem base para comparar, explica em vez de mostrar um número", () => {
    render(<Variacao percentual={null} />)
    expect(screen.getByText("Sem histórico para comparar")).toBeInTheDocument()
  })
})
