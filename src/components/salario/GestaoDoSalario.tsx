"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Info, Wallet } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { EditorDoPlano, type ParteInicial } from "@/components/salario/EditorDoPlano"
import { EscolhaDoModelo } from "@/components/salario/EscolhaDoModelo"
import { EtapasDoPlano } from "@/components/salario/EtapasDoPlano"
import { ReceitasDoSalario } from "@/components/salario/ReceitasDoSalario"
import { ResumoDoPlano } from "@/components/salario/ResumoDoPlano"
import { ComprometidoNoMes, SeuHistorico } from "@/components/salario/ReferenciasDoMes"
import { DesfazerDivisao } from "@/components/salario/DesfazerDivisao"
import { DivisoesRecentes } from "@/components/salario/DivisoesRecentes"
import { RevisaoDaDivisao } from "@/components/salario/RevisaoDaDivisao"
import { SalariosADividir } from "@/components/salario/SalariosADividir"
import { tratarErro } from "@/lib/erros"
import { modeloDoPlano } from "@/lib/salario"
import { cn } from "@/lib/utils"
import { accountsService } from "@/services/accounts"
import { getCategories } from "@/services/categories"
import { goalsService } from "@/services/goals"
import { salarioService } from "@/services/salario"
import type { Account } from "@/types/accounts"
import type { Category } from "@/types/categories"
import type { Goal } from "@/types/goals"
import type {
  DivisaoDoSalario,
  ModeloDeDivisao,
  PlanoDoSalario,
  RecebimentoDoSalario,
  ReferenciasDoSalario,
} from "@/types/salario"

type TelaDoPlano = "escolha" | "editor" | "resumo"

// Leva o painel ou a seção à vista, sem animar com movimento reduzido
function mostrar(elemento: HTMLElement | null) {
  const reduzido = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  elemento?.scrollIntoView?.({ behavior: reduzido ? "auto" : "smooth", block: "start" })
}

// Conteúdo da página da gestão do salário, montado só com o recurso
// liberado (SALARIO-15, SALARIO-16)
export function GestaoDoSalario() {
  const router = useRouter()
  const paramDividir = useSearchParams().get("dividir")
  const [pendentes, setPendentes] = useState<RecebimentoDoSalario[] | null>(null)
  const [referencias, setReferencias] = useState<ReferenciasDoSalario | null>(null)
  const [plano, setPlano] = useState<PlanoDoSalario | null>(null)
  const [modelos, setModelos] = useState<ModeloDeDivisao[] | null>(null)
  const [contas, setContas] = useState<Account[]>([])
  const [metas, setMetas] = useState<Goal[]>([])
  const [categorias, setCategorias] = useState<Category[] | null>(null)
  const [telaDoPlano, setTelaDoPlano] = useState<TelaDoPlano>("escolha")
  const [partesDoEditor, setPartesDoEditor] = useState<ParteInicial[]>([])
  // Troca a cada modelo escolhido ou plano salvo, para o editor recomeçar
  const [versaoDoEditor, setVersaoDoEditor] = useState(0)
  // Posição da parte cujo destino recebe o foco ao abrir o editor
  const [destinoEmFoco, setDestinoEmFoco] = useState<number | null>(null)
  // Recebimento na revisão da divisão
  const [revisando, setRevisando] = useState<string | null>(null)
  // SALARIO-22: recebimento que espera o plano ser salvo para ir à revisão
  const [dividirDepois, setDividirDepois] = useState<string | null>(null)
  // SALARIO-45: divisão na confirmação do desfazer
  const [paraDesfazer, setParaDesfazer] = useState<DivisaoDoSalario | null>(null)
  // SALARIO-45 e SALARIO-49: divisões que ainda podem ser desfeitas
  const [recentes, setRecentes] = useState<DivisaoDoSalario[] | null>(null)
  // SALARIO-13 e SALARIO-63: o campo da simulação, o mesmo no resumo e no
  // editor, que já vem com o salário recebido mais recente
  const [valorSimulado, setValorSimulado] = useState("")
  const [recebidoAnterior, setRecebidoAnterior] = useState<string | undefined>(undefined)
  const ultimoParam = useRef<string | null>(null)
  const painelDeReceitas = useRef<HTMLElement>(null)
  const secaoDoPlano = useRef<HTMLElement>(null)

  const valorRecebido = pendentes?.reduce<RecebimentoDoSalario | null>(
    (maisRecente, r) => (!maisRecente || r.date > maisRecente.date ? r : maisRecente),
    null,
  )?.amount
  // O salário recebido pode chegar depois do plano: preenche o campo se o
  // usuário ainda não digitou nada
  if (valorRecebido !== recebidoAnterior) {
    setRecebidoAnterior(valorRecebido)
    if (!valorSimulado && valorRecebido) setValorSimulado(valorRecebido)
  }

  async function carregarPendentes() {
    try {
      setPendentes(await salarioService.getPendentes())
    } catch (erro) {
      setPendentes([])
      tratarErro(erro, { mensagemPadrao: "Erro ao carregar os salários a dividir.", tentarDeNovo: carregarPendentes })
    }
  }

  async function carregarRecentes() {
    try {
      setRecentes(await salarioService.getDivisoesRecentes())
    } catch (erro) {
      setRecentes([])
      tratarErro(erro, { mensagemPadrao: "Erro ao carregar as divisões recentes.", tentarDeNovo: carregarRecentes })
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
    setTelaDoPlano(salvo.has_plan ? "resumo" : "escolha")
    setVersaoDoEditor((v) => v + 1)
  }

  // Plano salvo: o salário que esperava o plano vai para a revisão
  function planoSalvo(salvo: PlanoDoSalario) {
    abrirPlano(salvo)
    if (salvo.has_plan && dividirDepois) {
      setRevisando(dividirDepois)
      setDividirDepois(null)
    }
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
      setCategorias((atuais) => atuais ?? [])
      tratarErro(erro, { mensagemPadrao: "Erro ao carregar contas, metas e categorias.", tentarDeNovo: carregarOpcoes })
    }
  }

  useEffect(() => {
    void carregarPendentes()
    void carregarRecentes()
    void carregarReferencias()
    void carregarPlano()
    void carregarOpcoes()
    // Só na abertura da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Do aviso de nenhum salário a dividir para o painel Receitas de salário,
  // com o foco na primeira categoria
  const irParaReceitas = () => {
    const painel = painelDeReceitas.current
    if (!painel) return
    mostrar(painel)
    const alvo = painel.querySelector<HTMLElement>('[role="checkbox"]') ?? painel
    alvo.focus({ preventScroll: true })
  }

  // SALARIO-21 e SALARIO-22: com plano, abre a revisão; sem plano, abre antes
  // a escolha do modelo
  function iniciarDivisao(recebimentoId: string, temPlano: boolean) {
    if (temPlano) {
      setRevisando(recebimentoId)
    } else {
      setDividirDepois(recebimentoId)
      setTelaDoPlano("escolha")
      mostrar(secaoDoPlano.current)
    }
  }

  // /salario?dividir=<id>, vindo do aviso do salário
  useEffect(() => {
    if (!plano || !paramDividir || paramDividir === ultimoParam.current) return
    ultimoParam.current = paramDividir
    iniciarDivisao(paramDividir, plano.has_plan)
  }, [plano, paramDividir])

  const dividir = (recebimento: RecebimentoDoSalario) => {
    if (plano) iniciarDivisao(recebimento.id, plano.has_plan)
  }

  const fecharRevisao = (aberta: boolean) => {
    if (aberta) return
    setRevisando(null)
    if (paramDividir) router.replace("/salario")
  }

  // SALARIO-14: as categorias de salário mudaram; o plano fica como está e
  // os salários a dividir são relidos com as novas categorias
  const categoriasSalvas = (salvo: PlanoDoSalario) => {
    setPlano((atual) => (atual ? { ...atual, salary_categories: salvo.salary_categories } : salvo))
    void carregarPendentes()
  }

  // O plano salvo vai para o editor, no mesmo lugar do resumo; de "Escolher
  // destino", com o foco no destino da parte
  const editarPlano = (focarDestino: number | null = null) => {
    if (!plano) return
    setPartesDoEditor(plano.parts)
    setDestinoEmFoco(focarDestino)
    setTelaDoPlano("editor")
    setVersaoDoEditor((v) => v + 1)
  }

  // SALARIO-02, SALARIO-03 e SALARIO-06: o modelo monta as partes no editor;
  // o plano só muda ao salvar
  const escolherModelo = (modelo: ModeloDeDivisao) => {
    setPartesDoEditor(modelo.parts)
    setDestinoEmFoco(null)
    setTelaDoPlano("editor")
    setVersaoDoEditor((v) => v + 1)
  }

  // Status do cabeçalho: o modelo do plano salvo, ou quantas partes ele tem
  const status = !plano
    ? null
    : plano.has_plan
      ? `Plano ativo: ${modeloDoPlano(plano.parts, modelos) ?? `${plano.parts.length} ${plano.parts.length === 1 ? "parte" : "partes"}`}`
      : "Sem plano ainda"

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gestão do salário</h1>
            <p className="text-sm text-muted-foreground">Separe o que vai guardar assim que o salário cair.</p>
          </div>
        </div>
        {status && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              aria-hidden
              className={cn("h-2 w-2 rounded-full", plano?.has_plan ? "bg-emerald-500" : "bg-muted-foreground/40")}
            />
            {status}
          </p>
        )}
      </header>

      <SalariosADividir recebimentos={pendentes} onDividir={dividir} onEscolherReceitas={irParaReceitas} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <section ref={secaoDoPlano} aria-labelledby="seu-plano-titulo" className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:col-span-2 scroll-mt-24">
          <h2 id="seu-plano-titulo" className="text-base font-semibold">
            Seu plano
          </h2>

          {dividirDepois && telaDoPlano === "escolha" && (
            <p role="status" className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm">
              <Info aria-hidden className="h-4 w-4 shrink-0 text-primary" />
              Escolha um modelo e salve o seu plano. Em seguida, a revisão da divisão do salário abre.
            </p>
          )}

          {plano && !plano.has_plan && telaDoPlano !== "resumo" && (
            <EtapasDoPlano
              etapa={telaDoPlano === "escolha" ? 2 : 3}
              categoriasDoSalario={plano.salary_categories}
              categorias={categorias}
              onEscolherReceitas={irParaReceitas}
            />
          )}

          {plano === null ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : telaDoPlano === "resumo" ? (
            <ResumoDoPlano
              partes={plano.parts}
              referencias={referencias}
              onEditar={() => editarPlano()}
              onEscolherDestino={editarPlano}
              valorSimulado={valorSimulado}
              onValorSimulado={setValorSimulado}
              valorRecebido={valorRecebido}
            />
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
              focarDestino={destinoEmFoco}
              categoriasDoSalario={plano.salary_categories}
              contas={contas}
              metas={metas}
              referencias={referencias}
              valorSimulado={valorSimulado}
              onValorSimulado={setValorSimulado}
              valorRecebido={valorRecebido}
              onSalvo={planoSalvo}
              onTrocarModelo={() => setTelaDoPlano("escolha")}
              onCancelar={plano.has_plan ? () => abrirPlano(plano) : undefined}
            />
          )}
        </section>

        <aside aria-label="Receitas e referências do mês" className="space-y-6">
          <ReceitasDoSalario
            ref={painelDeReceitas}
            categorias={categorias}
            salvas={plano?.salary_categories ?? null}
            onSalvas={categoriasSalvas}
          />
          <ComprometidoNoMes referencias={referencias} />
          <SeuHistorico referencias={referencias} />
          <DivisoesRecentes divisoes={recentes} onDesfazer={setParaDesfazer} />
        </aside>
      </div>

      <RevisaoDaDivisao
        recebimentoId={revisando}
        onOpenChange={fecharRevisao}
        onGerada={() => {
          void carregarPendentes()
          void carregarRecentes()
        }}
        onDesfazer={setParaDesfazer}
      />

      <DesfazerDivisao
        divisao={paraDesfazer}
        onOpenChange={(aberta) => !aberta && setParaDesfazer(null)}
        onDesfeita={() => {
          // SALARIO-47: o salário volta à lista de salários a dividir, e a
          // divisão sai das divisões recentes
          setParaDesfazer(null)
          fecharRevisao(false)
          void carregarPendentes()
          void carregarRecentes()
        }}
      />
    </div>
  )
}
