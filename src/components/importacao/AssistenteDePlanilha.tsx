"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Loader2, Table as TableIcon } from "lucide-react"

import { PassoArquivo } from "@/components/importacao/PassoArquivo"
import { mesclarPlano } from "@/components/importacao/plano"
import { RevisaoDeAbas } from "@/components/importacao/RevisaoDeAbas"
import { CAMPOS_DA_CONTA, campoDoErroDaConta, RevisaoDeContas } from "@/components/importacao/RevisaoDeContas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatarMoeda } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { api } from "@/services/apiClient"
import { analisarArquivo } from "@/services/import-export"
import type { Account } from "@/types/accounts"
import type { AnaliseDeImportacao, PlanoDeImportacao, ResumoDaAnalise } from "@/types/importacao"

// IMPCOMP-44: as mudanças no plano esperam um pouco antes de pedir a nova
// análise, para várias mudanças seguidas virarem uma chamada só
export const ESPERA_DA_NOVA_ANALISE_MS = 400

type AbaDaRevisao = "abas" | "contas" | "linhas"

interface AssistenteDePlanilhaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// IMPCOMP-37: o resumo fixo no topo da revisão
function ResumoDaRevisao({ resumo }: { resumo: ResumoDaAnalise }) {
  const contagens = [
    { rotulo: "Válidas", valor: resumo.validas, cor: "text-emerald-600" },
    { rotulo: "Rejeitadas", valor: resumo.rejeitadas, cor: "text-rose-600" },
    { rotulo: "Repetidas", valor: resumo.repetidas, cor: "text-blue-600" },
    { rotulo: "Excluídas", valor: resumo.excluidas, cor: "text-muted-foreground" },
    { rotulo: "Contas novas", valor: resumo.contas_novas, cor: "text-primary" },
  ]
  const totais = [
    { rotulo: "Receitas", total: resumo.receitas, cor: "text-emerald-600" },
    { rotulo: "Despesas", total: resumo.despesas, cor: "text-rose-600" },
    { rotulo: "Transferências", total: resumo.transferencias, cor: "text-blue-600" },
  ]

  return (
    <section aria-label="Resumo da análise" className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {contagens.map(({ rotulo, valor, cor }) => (
          <div key={rotulo} data-testid={`resumo-${rotulo}`} className="p-3 rounded-2xl bg-muted/20 border border-border/40 text-center">
            <p className={`text-xl font-black leading-none ${cor}`}>{valor}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 mt-1">{rotulo}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {totais.map(({ rotulo, total, cor }) => (
          <div
            key={rotulo}
            data-testid={`resumo-${rotulo}`}
            className="px-3 py-2 rounded-2xl bg-muted/10 border border-border/40 flex items-center justify-between gap-2"
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
              {rotulo} ({total.quantidade})
            </span>
            <span className={`text-xs font-black tabular-nums ${cor}`}>{formatarMoeda(total.valor)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// O conteúdo só existe com o diálogo aberto: fechar descarta o arquivo, a
// análise e o plano
export function AssistenteDePlanilha({ open, onOpenChange }: AssistenteDePlanilhaProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] max-h-[95vh] rounded-[32px] border-border/60 bg-card shadow-2xl overflow-hidden p-0">
        <ConteudoDoAssistente />
      </DialogContent>
    </Dialog>
  )
}

function ConteudoDoAssistente() {
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

  const emRevisao = !!arquivo && !!analise
  return (
    <div className="p-6 overflow-y-auto max-h-[95vh] custom-scrollbar">
      <DialogHeader className="mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-blue-500/10 text-blue-500">
            <TableIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-2xl font-black tracking-tight">Importar planilha</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground mt-1 truncate">
              {emRevisao ? `Revise o que foi reconhecido em ${arquivo.name}.` : "Escolha o arquivo exportado do seu app ou banco."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {!emRevisao && <PassoArquivo analisando={analisando} onEscolher={escolherArquivo} />}

      {emRevisao && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <ResumoDaRevisao resumo={analise.resumo} />

          <Tabs value={abaAtiva} onValueChange={(valor) => setAbaAtiva(valor as AbaDaRevisao)}>
            <TabsList className="grid grid-cols-3 h-11 w-full bg-muted/20 rounded-2xl p-1 border border-border/40">
              <TabsTrigger value="abas" className="rounded-xl font-bold text-xs">Abas e colunas</TabsTrigger>
              <TabsTrigger value="contas" className="rounded-xl font-bold text-xs">Contas</TabsTrigger>
              <TabsTrigger value="linhas" className="rounded-xl font-bold text-xs">Linhas</TabsTrigger>
            </TabsList>
            <TabsContent value="abas" className="pt-2">
              <RevisaoDeAbas plano={plano} onAlterar={alterarPlano} />
            </TabsContent>
            <TabsContent value="contas" className="pt-2">
              <RevisaoDeContas plano={plano} contasAtivas={contasAtivas} erros={errosDasContas} onAlterar={alterarPlano} />
            </TabsContent>
            <TabsContent value="linhas" className="pt-2">{null}</TabsContent>
          </Tabs>

          <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="w-full sm:flex-1 rounded-full font-black uppercase text-[10px] h-12"
              onClick={trocarArquivo}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Trocar arquivo
            </Button>
            <p
              aria-live="polite"
              className="w-full sm:flex-[2] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground min-h-12"
            >
              {analisando && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analisando de novo...
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
