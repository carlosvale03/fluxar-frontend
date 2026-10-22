"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { PassoArquivo } from "@/components/importacao/PassoArquivo"
import { mesclarPlano } from "@/components/importacao/plano"
import { RevisaoDeAbas } from "@/components/importacao/RevisaoDeAbas"
import { ResultadoDaImportacao } from "@/components/importacao/ResultadoDaImportacao"
import { RevisaoDeLinhas } from "@/components/importacao/RevisaoDeLinhas"
import { CAMPOS_DA_CONTA, campoDoErroDaConta, RevisaoDeContas } from "@/components/importacao/RevisaoDeContas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlan } from "@/hooks/use-plan"
import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { tratarErro } from "@/lib/erros"
import { api } from "@/services/apiClient"
import { analisarArquivo, importarArquivo } from "@/services/import-export"
import type { Account } from "@/types/accounts"
import type {
  AnaliseDeImportacao,
  PlanoDeImportacao,
  ResultadoDaImportacao as Resultado,
  ResumoDaAnalise,
} from "@/types/importacao"

// IMPCOMP-44: as mudanças no plano esperam um pouco antes de pedir a nova
// análise, para várias mudanças seguidas virarem uma chamada só
export const ESPERA_DA_NOVA_ANALISE_MS = 400

type AbaDaRevisao = "abas" | "contas" | "linhas"

interface AssistenteDePlanilhaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// IMPCOMP-37: o resumo fixo no topo da revisão. A cor acompanha sempre o
// rótulo em texto (DESIGN.md §2, princípio 3)
function ResumoDaRevisao({ resumo }: { resumo: ResumoDaAnalise }) {
  const contagens = [
    { rotulo: "Válidas", valor: resumo.validas, cor: "text-inflow" },
    { rotulo: "Rejeitadas", valor: resumo.rejeitadas, cor: "text-outflow" },
    { rotulo: "Repetidas", valor: resumo.repetidas, cor: "text-info" },
    { rotulo: "Excluídas", valor: resumo.excluidas, cor: "text-muted-foreground" },
    { rotulo: "Contas novas", valor: resumo.contas_novas, cor: "text-foreground" },
  ]
  const totais = [
    { rotulo: "Receitas", total: resumo.receitas, cor: "text-inflow" },
    { rotulo: "Despesas", total: resumo.despesas, cor: "text-outflow" },
    { rotulo: "Transferências", total: resumo.transferencias, cor: "text-foreground" },
  ]

  return (
    <section aria-label="Resumo da análise" className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {contagens.map(({ rotulo, valor, cor }) => (
          <div key={rotulo} data-testid={`resumo-${rotulo}`} className="space-y-1 rounded-md border border-border bg-card p-3">
            <p className={`value-l ${cor}`}>{valor}</p>
            <p className="label text-muted-foreground">{rotulo}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {totais.map(({ rotulo, total, cor }) => (
          <div
            key={rotulo}
            data-testid={`resumo-${rotulo}`}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
          >
            <span className="label text-muted-foreground">
              {rotulo} ({total.quantidade})
            </span>
            <span className={`value-m ${cor}`}>{formatarMoeda(total.valor)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

type Etapa = "arquivo" | "revisao" | "resultado"

const ETAPAS: { valor: Etapa; rotulo: string }[] = [
  { valor: "arquivo", rotulo: "Arquivo" },
  { valor: "revisao", rotulo: "Revisão" },
  { valor: "resultado", rotulo: "Resultado" },
]

// AZ-30: as três etapas do assistente sempre à vista; a atual tem a marca de
// ouro e aria-current. Voltar para o arquivo é o botão "Trocar arquivo".
function IndicadorDeEtapas({ atual }: { atual: Etapa }) {
  const indiceAtual = ETAPAS.findIndex(({ valor }) => valor === atual)
  return (
    <ol aria-label="Etapas da importação" className="flex items-center gap-2">
      {ETAPAS.map(({ valor, rotulo }, indice) => {
        const ativa = indice === indiceAtual
        const feita = indice < indiceAtual
        return (
          <li
            key={valor}
            aria-current={ativa ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                ativa && "border-gold-line text-gold-line",
                feita && "border-border-strong text-inflow",
                !ativa && !feita && "border-border-strong text-muted-foreground",
              )}
            >
              {feita ? <Check className="h-3.5 w-3.5" /> : indice + 1}
            </span>
            <span className={cn("label truncate", ativa ? "text-foreground" : "text-muted-foreground")}>
              {rotulo}
              {feita && <span className="sr-only"> (concluída)</span>}
            </span>
            {indice < ETAPAS.length - 1 && <span aria-hidden="true" className="h-px flex-1 bg-border" />}
          </li>
        )
      })}
    </ol>
  )
}

// O conteúdo só existe com o diálogo aberto: fechar descarta o arquivo, a
// análise e o plano
export function AssistenteDePlanilha({ open, onOpenChange }: AssistenteDePlanilhaProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-hidden p-0 sm:max-w-[960px]">
        <ConteudoDoAssistente onFechar={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ConteudoDoAssistente({ onFechar }: { onFechar: () => void }) {
  const { atualizarUso } = usePlan()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [analise, setAnalise] = useState<AnaliseDeImportacao | null>(null)
  const [plano, setPlano] = useState<PlanoDeImportacao>({})
  const [analisando, setAnalisando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<AbaDaRevisao>("abas")
  // O plano mais recente, para a resposta de uma análise não apagar uma
  // edição feita enquanto ela rodava
  const planoAtual = useRef<PlanoDeImportacao>({})
  // Só a resposta do último pedido vale
  const ultimoPedido = useRef(0)
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [contasAtivas, setContasAtivas] = useState<Account[]>([])
  // Erros do backend nos campos das contas do plano (IMPCOMP-24, IMPCOMP-28)
  const [errosDasContas, setErrosDasContas] = useState<Record<string, string>>({})
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const carregarContas = async () => {
    try {
      const resposta = await api.get<Account[]>("/accounts/")
      setContasAtivas(resposta.data.filter((conta) => conta.is_active !== false))
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao carregar contas.", tentarDeNovo: carregarContas })
    }
  }

  useEffect(() => {
    void carregarContas()
    return () => {
      if (espera.current) clearTimeout(espera.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // O erro de um campo de conta vai para a conta na aba Contas; os demais
  // vão para o Sonner
  const mostrarErro = (erro: unknown, enviado: PlanoDeImportacao | undefined, mensagemPadrao: string) => {
    const nomes = Object.keys(enviado?.contas ?? {})
    const campos = nomes.flatMap((nome) => CAMPOS_DA_CONTA.map((campo) => campoDoErroDaConta(nome, campo)))
    const erros: Record<string, string> = {}
    const form = {
      setError: (campo: string, { message }: { type: string; message: string }) => {
        erros[campo] = message
      },
    }
    tratarErro(erro, { form, campos, mensagemPadrao })
    setErrosDasContas(erros)
    if (Object.keys(erros).length) setAbaAtiva("contas")
  }

  const guardarPlano = (novo: PlanoDeImportacao) => {
    planoAtual.current = novo
    setPlano(novo)
  }

  const analisar = async (escolhido: File, enviado?: PlanoDeImportacao) => {
    const pedido = ++ultimoPedido.current
    setAnalisando(true)
    try {
      const resposta = await analisarArquivo(escolhido, enviado)
      if (pedido !== ultimoPedido.current) return
      setAnalise(resposta)
      setErrosDasContas({})
      guardarPlano(enviado ? mesclarPlano(planoAtual.current, resposta.plano) : resposta.plano)
    } catch (erro) {
      if (pedido !== ultimoPedido.current) return
      mostrarErro(erro, enviado, "Erro ao analisar a planilha.")
    } finally {
      if (pedido === ultimoPedido.current) setAnalisando(false)
    }
  }

  // IMPCOMP-43: escolher o arquivo já pede a análise
  const escolherArquivo = async (escolhido: File) => {
    setArquivo(escolhido)
    setAnalise(null)
    guardarPlano({})
    await analisar(escolhido)
  }

  // IMPCOMP-42 e IMPCOMP-44: a mudança vale na hora na tela; as que mudam a
  // interpretação pedem uma nova análise com o plano editado
  const alterarPlano = (novo: PlanoDeImportacao, { reanalisar = true }: { reanalisar?: boolean } = {}) => {
    guardarPlano(novo)
    if (!reanalisar || !arquivo) return
    if (espera.current) clearTimeout(espera.current)
    // Uma análise em andamento ficou velha
    ultimoPedido.current += 1
    setAnalisando(true)
    espera.current = setTimeout(() => {
      espera.current = null
      void analisar(arquivo, planoAtual.current)
    }, ESPERA_DA_NOVA_ANALISE_MS)
  }

  const trocarArquivo = () => {
    if (espera.current) clearTimeout(espera.current)
    ultimoPedido.current += 1
    setArquivo(null)
    setAnalise(null)
    guardarPlano({})
    setAnalisando(false)
  }

  // IMPCOMP-45: a importação grava o plano revisado numa requisição só
  const importar = async () => {
    if (!arquivo) return
    const enviado = planoAtual.current
    setImportando(true)
    try {
      const resposta = await importarArquivo(arquivo, enviado)
      setResultado(resposta)
      toast.success("Importação concluída.")
      // PERM-20: as contas criadas contam no limite do plano
      if (resposta.accounts_created?.length) await atualizarUso()
    } catch (erro) {
      mostrarErro(erro, enviado, "Erro ao importar a planilha.")
    } finally {
      setImportando(false)
    }
  }

  const emRevisao = !!arquivo && !!analise && !resultado
  const etapa: Etapa = resultado ? "resultado" : emRevisao ? "revisao" : "arquivo"
  return (
    <div className="custom-scrollbar max-h-[95vh] space-y-5 overflow-y-auto p-6">
      <DialogHeader className="space-y-1 pr-8">
        <DialogTitle>
          {resultado ? "Importação concluída" : "Importar planilha"}
        </DialogTitle>
        <DialogDescription className="truncate">
          {resultado
            ? "Resumo do que foi gravado, por aba."
            : emRevisao
              ? `Revise o que foi reconhecido em ${arquivo.name}.`
              : "Escolha o arquivo exportado do seu app ou banco."}
        </DialogDescription>
      </DialogHeader>

      <IndicadorDeEtapas atual={etapa} />

      {resultado && <ResultadoDaImportacao resultado={resultado} onFechar={onFechar} />}

      {!emRevisao && !resultado && <PassoArquivo analisando={analisando} onEscolher={escolherArquivo} />}

      {emRevisao && (
        <div className="space-y-4">
          <ResumoDaRevisao resumo={analise.resumo} />

          <Tabs value={abaAtiva} onValueChange={(valor) => setAbaAtiva(valor as AbaDaRevisao)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="abas">Abas e colunas</TabsTrigger>
              <TabsTrigger value="contas">Contas</TabsTrigger>
              <TabsTrigger value="linhas">Linhas</TabsTrigger>
            </TabsList>
            <TabsContent value="abas" className="pt-2">
              <RevisaoDeAbas plano={plano} onAlterar={alterarPlano} />
            </TabsContent>
            <TabsContent value="contas" className="pt-2">
              <RevisaoDeContas plano={plano} contasAtivas={contasAtivas} erros={errosDasContas} onAlterar={alterarPlano} />
            </TabsContent>
            <TabsContent value="linhas" className="pt-2">
              <RevisaoDeLinhas linhas={analise.linhas} plano={plano} onAlterar={alterarPlano} />
            </TabsContent>
          </Tabs>

          <div className="flex flex-col-reverse items-center gap-3 border-t border-border pt-4 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={trocarArquivo} disabled={importando}>
              <ArrowLeft aria-hidden="true" /> Trocar arquivo
            </Button>
            <p
              aria-live="polite"
              className="flex min-h-9 w-full flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              {analisando && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Analisando de novo...
                </>
              )}
            </p>
            <Button className="w-full sm:w-auto" onClick={importar} disabled={analisando || importando}>
              {importando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              {importando ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
