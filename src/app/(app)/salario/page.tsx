"use client"

import { Suspense } from "react"

import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import { GestaoDoSalario } from "@/components/salario/GestaoDoSalario"

// SALARIO-15 e SALARIO-16: a Partilha (gestão do salário) fica no menu e, com o recurso
// travado, a página mostra o aviso do plano sem chamar as rotas
export default function SalarioPage() {
  return (
    <RecursoBloqueado chave="gestao_do_salario" titulo="Partilha" className="container mx-auto my-10 max-w-3xl">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Suspense fallback={null}>
          <GestaoDoSalario />
        </Suspense>
      </div>
    </RecursoBloqueado>
  )
}
