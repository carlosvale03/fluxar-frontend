import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AnelDeProgresso, BarraDeRota, Bussola } from "@/components/ui/medicao"

// AZ-17: os componentes de medição dizem o número e a situação em texto
describe("Bussola", () => {
  it("dentro da tolerância, diz o desvio e a situação para o leitor de tela", () => {
    render(<Bussola desvio={12} tolerancia={15} />)
    expect(screen.getByRole("img", { name: "Desvio de 12% acima do plano, dentro da tolerância de 15%" })).toBeInTheDocument()
  })

  it("fora da tolerância, o número fica em alerta", () => {
    render(<Bussola desvio={-22.5} tolerancia={15} />)
    expect(screen.getByRole("img", { name: /22,5% abaixo do plano, fora da tolerância/ })).toBeInTheDocument()
    expect(screen.getByText("−22,5%")).toHaveClass("text-warn")
  })
})

describe("AnelDeProgresso", () => {
  it("anuncia o percentual e marca o destino alcançado", () => {
    const { rerender } = render(<AnelDeProgresso percentual={62} nome="Viagem" />)
    expect(screen.getByRole("img", { name: "Viagem: 62%" })).toBeInTheDocument()

    rerender(<AnelDeProgresso percentual={104} nome="Reserva" />)
    expect(screen.getByRole("img", { name: "Reserva: 100%, alcançado" })).toBeInTheDocument()
  })
})

describe("BarraDeRota", () => {
  it("acima do limite, mostra o valor em alerta e o desvio com sinal", () => {
    render(<BarraDeRota nome="Mercado" gasto="1416" limite="1200" tolerancia={10} />)
    expect(screen.getByRole("img", { name: /Mercado: R\$\s1\.416,00 de R\$\s1\.200,00, 18% acima do limite/ })).toBeInTheDocument()
    expect(screen.getByText("+18%")).toBeInTheDocument()
  })

  it("abaixo do limite, o desvio vem com o sinal de menos", () => {
    render(<BarraDeRota nome="Transporte" gasto="380" limite="600" />)
    expect(screen.getByText("−36,7%")).toBeInTheDocument()
  })
})
