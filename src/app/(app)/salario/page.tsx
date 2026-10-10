"use client"

import { Suspense } from "react"
import { Wallet } from "lucide-react"

import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import { GestaoDoSalario } from "@/components/salario/GestaoDoSalario"

// SALARIO-15 e SALARIO-16: a gestão do salário fica no menu e, com o recurso
// travado, a página mostra o aviso do plano sem chamar as rotas
export default function SalarioPage() {
  return (
    <RecursoBloqueado chave="gestao_do_salario" titulo="Gestão do salário" className="container mx-auto my-10 max-w-3xl">
      <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground/90">Gestão do salário</h1>
            <p className="text-muted-foreground mt-1.5 font-medium">
              Separe o que vai guardar e o que já está comprometido assim que o salário cair.
            </p>
          </div>
        </div>
        <Suspense fallback={null}>
          <GestaoDoSalario />
        </Suspense>
      </div>
    </RecursoBloqueado>
  )
}
