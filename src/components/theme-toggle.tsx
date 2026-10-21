"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

const semAssinatura = () => () => {}

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  // O tema só é conhecido no navegador; no servidor o rótulo fica neutro
  const montado = React.useSyncExternalStore(semAssinatura, () => true, () => false)
  const escuro = montado && resolvedTheme === "dark"
  const rotulo = !montado ? "Alternar tema" : escuro ? "Usar o tema claro" : "Usar o tema escuro"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(escuro ? "light" : "dark")}
      title={rotulo}
      aria-label={rotulo}
    >
      <Sun aria-hidden="true" className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon aria-hidden="true" className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
