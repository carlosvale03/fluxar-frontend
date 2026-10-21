"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

// AZ-21.7: na troca de rota, o foco vai para o conteúdo novo (o leitor de tela
// anuncia a página em vez de continuar no link clicado). Não age na primeira carga.
export function FocoNaTrocaDeRota() {
  const pathname = usePathname()
  const anterior = useRef(pathname)

  useEffect(() => {
    if (anterior.current === pathname) return
    anterior.current = pathname
    const titulo = document.querySelector<HTMLElement>("#conteudo h1")
    const alvo = titulo ?? document.getElementById("conteudo")
    if (!alvo) return
    if (!alvo.hasAttribute("tabindex")) alvo.setAttribute("tabindex", "-1")
    alvo.focus({ preventScroll: true })
  }, [pathname])

  return null
}
