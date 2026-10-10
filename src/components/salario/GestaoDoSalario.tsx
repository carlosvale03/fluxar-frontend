"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { ReferenciasDoMes } from "@/components/salario/ReferenciasDoMes"
import { SalariosADividir } from "@/components/salario/SalariosADividir"
import { tratarErro } from "@/lib/erros"
import { salarioService } from "@/services/salario"
import type { RecebimentoDoSalario, ReferenciasDoSalario } from "@/types/salario"

// Conteúdo da página da gestão do salário, montado só com o recurso
// liberado (SALARIO-15, SALARIO-16)
export function GestaoDoSalario() {
  const router = useRouter()
  const [pendentes, setPendentes] = useState<RecebimentoDoSalario[] | null>(null)
  const [referencias, setReferencias] = useState<ReferenciasDoSalario | null>(null)

  async function carregarPendentes() {
    try {
      setPendentes(await salarioService.getPendentes())
    } catch (erro) {
      setPendentes([])
      tratarErro(erro, { mensagemPadrao: "Erro ao carregar os salários a dividir.", tentarDeNovo: carregarPendentes })
    }
  }

  async function carregarReferencias() {
    try {
      setReferencias(await salarioService.getReferencias())
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao carregar o histórico.", tentarDeNovo: carregarReferencias })
    }
  }

  useEffect(() => {
    void carregarPendentes()
    void carregarReferencias()
    // Só na abertura da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dividir = (recebimento: RecebimentoDoSalario) => {
    router.replace(`/salario?dividir=${recebimento.id}`)
  }

  return (
    <div className="space-y-6">
      <SalariosADividir recebimentos={pendentes} onDividir={dividir} />
      <ReferenciasDoMes referencias={referencias} />
    </div>
  )
}
