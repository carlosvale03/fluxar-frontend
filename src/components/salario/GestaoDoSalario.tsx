"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { EditorDoPlano, type ParteInicial } from "@/components/salario/EditorDoPlano"
import { EscolhaDoModelo } from "@/components/salario/EscolhaDoModelo"
import { ReferenciasDoMes } from "@/components/salario/ReferenciasDoMes"
import { SalariosADividir } from "@/components/salario/SalariosADividir"
import { tratarErro } from "@/lib/erros"
import { accountsService } from "@/services/accounts"
import { getCategories } from "@/services/categories"
import { goalsService } from "@/services/goals"
import { salarioService } from "@/services/salario"
import type { Account } from "@/types/accounts"
import type { Category } from "@/types/categories"
import type { Goal } from "@/types/goals"
import type {
  ModeloDeDivisao,
  PlanoDoSalario,
  RecebimentoDoSalario,
  ReferenciasDoSalario,
} from "@/types/salario"

type TelaDoPlano = "escolha" | "editor"

// Conteúdo da página da gestão do salário, montado só com o recurso
// liberado (SALARIO-15, SALARIO-16)
export function GestaoDoSalario() {
  const router = useRouter()
  const [pendentes, setPendentes] = useState<RecebimentoDoSalario[] | null>(null)
  const [referencias, setReferencias] = useState<ReferenciasDoSalario | null>(null)
  const [plano, setPlano] = useState<PlanoDoSalario | null>(null)
  const [modelos, setModelos] = useState<ModeloDeDivisao[] | null>(null)
  const [contas, setContas] = useState<Account[]>([])
  const [metas, setMetas] = useState<Goal[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [telaDoPlano, setTelaDoPlano] = useState<TelaDoPlano>("escolha")
  const [partesDoEditor, setPartesDoEditor] = useState<ParteInicial[]>([])
  // Troca a cada modelo escolhido ou plano salvo, para o editor recomeçar
  const [versaoDoEditor, setVersaoDoEditor] = useState(0)

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

  function abrirPlano(salvo: PlanoDoSalario) {
    setPlano(salvo)
    setPartesDoEditor(salvo.parts)
    setTelaDoPlano(salvo.has_plan ? "editor" : "escolha")
    setVersaoDoEditor((v) => v + 1)
  }

  async function carregarPlano() {
    try {
      const [salvo, lista] = await Promise.all([salarioService.getPlano(), salarioService.getModelos()])
      setModelos(lista)
      abrirPlano(salvo)
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao carregar o plano de divisão.", tentarDeNovo: carregarPlano })
    }
  }

  // Destinos das partes e categorias de salário
  async function carregarOpcoes() {
    try {
      const [listaDeContas, listaDeMetas, listaDeCategorias] = await Promise.all([
        accountsService.getAccounts(),
        goalsService.getGoals(),
        getCategories(),
      ])
      setContas(listaDeContas)
      setMetas(listaDeMetas)
      setCategorias(listaDeCategorias.filter((c) => c.type === "INCOME" && c.is_active !== false))
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao carregar contas, metas e categorias.", tentarDeNovo: carregarOpcoes })
    }
  }

  useEffect(() => {
    void carregarPendentes()
    void carregarReferencias()
    void carregarPlano()
    void carregarOpcoes()
    // Só na abertura da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dividir = (recebimento: RecebimentoDoSalario) => {
    router.replace(`/salario?dividir=${recebimento.id}`)
  }

  // SALARIO-02, SALARIO-03 e SALARIO-06: o modelo monta as partes no editor;
  // o plano só muda ao salvar
  const escolherModelo = (modelo: ModeloDeDivisao) => {
    setPartesDoEditor(modelo.parts)
    setTelaDoPlano("editor")
    setVersaoDoEditor((v) => v + 1)
  }

  return (
    <div className="space-y-6">
      <SalariosADividir recebimentos={pendentes} onDividir={dividir} />
      <ReferenciasDoMes referencias={referencias} />

      {plano === null ? (
        <Skeleton className="h-64 w-full rounded-[32px]" />
      ) : telaDoPlano === "escolha" ? (
        <EscolhaDoModelo
          modelos={modelos}
          referencias={referencias}
          onEscolher={escolherModelo}
          onCancelar={plano.has_plan ? () => abrirPlano(plano) : undefined}
        />
      ) : (
        <EditorDoPlano
          key={versaoDoEditor}
          partesIniciais={partesDoEditor}
          categoriasIniciais={plano.salary_categories}
          contas={contas}
          metas={metas}
          categorias={categorias}
          referencias={referencias}
          onSalvo={abrirPlano}
          onTrocarModelo={() => setTelaDoPlano("escolha")}
        />
      )}
    </div>
  )
}
