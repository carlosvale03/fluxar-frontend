"use client"

import type { ReactNode } from "react"
import { MotionConfig } from "framer-motion"

// AZ-35: o framer-motion respeita o "reduzir movimento" do sistema em todo o
// app (sem deslocamento, só a opacidade). Fica aqui, e não em cada página,
// para o HTML do servidor e o do navegador começarem iguais na hidratação.
export function MovimentoProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
