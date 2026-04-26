"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number
  onValueChange: (value: number) => void
  className?: string
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const formatValue = (val: number) => {
      if (val === 0) return ""
      return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val)
    }

    const [displayValue, setDisplayValue] = React.useState(formatValue(value))

    React.useEffect(() => {
      setDisplayValue(formatValue(value))
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "")
      const numericValue = Number(rawValue) / 100
      onValueChange(numericValue)
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder="0,00"
        className={cn("text-right font-mono", className)}
      />
    )
  }
)

MoneyInput.displayName = "MoneyInput"
