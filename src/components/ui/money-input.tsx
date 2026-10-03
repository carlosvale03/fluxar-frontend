"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatarMoeda, lerValorDigitado } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  // Texto decimal da API ("1234.56"); vazio mostra o campo em branco
  value: string
  // Texto decimal lido por AD-009, ou null quando o texto não é um valor
  onValueChange: (value: string | null) => void
  // CONTRATO-20: só campos como o novo saldo aceitam o sinal de menos
  permitirNegativo?: boolean
  className?: string
}

const exibir = (valor: string) => (valor ? formatarMoeda(valor) : "")

// CONTRATO-19 a CONTRATO-21: texto livre, lido pela regra de AD-009 ao
// digitar, ao sair do campo e ao colar; ao sair e ao colar, mostra o valor em reais.
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, permitirNegativo = false, className, onBlur, ...props }, ref) => {
    const [texto, setTexto] = React.useState(exibir(value))
    // Último valor que o próprio campo entregou: só um valor diferente, vindo
    // de fora (edição, reset do formulário), troca o texto em edição
    const entregue = React.useRef<string | null>(value)

    React.useEffect(() => {
      if (value !== (entregue.current ?? "")) {
        entregue.current = value
        setTexto(exibir(value))
      }
    }, [value])

    const entregar = (valor: string | null) => {
      entregue.current = valor
      onValueChange(valor)
    }

    const ler = (valor: string) => lerValorDigitado(valor, { negativo: permitirNegativo })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Só o que pode compor um valor; sem permitirNegativo, o sinal é recusado
      const permitidos = permitirNegativo ? /[^\d.,\-R$\s]/g : /[^\d.,R$\s]/g
      const novo = e.target.value.replace(permitidos, "")
      setTexto(novo)
      entregar(ler(novo))
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const lido = ler(texto)
      entregar(lido)
      if (lido !== null) setTexto(formatarMoeda(lido))
      onBlur?.(e)
    }

    // CONTRATO-21: o valor colado segue a mesma regra ("100" vira R$ 100,00)
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const lido = ler(e.clipboardData.getData("text"))
      if (lido === null) return
      e.preventDefault()
      setTexto(formatarMoeda(lido))
      entregar(lido)
    }

    return (
      <Input
        {...props}
        ref={ref}
        inputMode="decimal"
        value={texto}
        onChange={handleChange}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder="0,00"
        className={cn("text-right font-mono", className)}
      />
    )
  }
)

MoneyInput.displayName = "MoneyInput"
