"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import {
  Download,
  Upload,
  FileText,
  Table as TableIcon,
  HelpCircle,
  History,
  Info,
} from "lucide-react"
import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { AssistenteDePlanilha } from "@/components/importacao/AssistenteDePlanilha"
import { ImportDialog } from "@/components/transactions/import-dialog"
import { TransactionFilters, FilterState } from "@/components/transactions/transaction-filters"
import { startOfMonth, endOfMonth } from "date-fns"
import { importExportService } from "@/services/import-export"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Formato = "PDF" | "XLS"

// Ícone de um card: contorno neutro, sem cor de destaque (o ouro fica no botão)
function IconeDoCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border-strong text-fg-secondary [&_svg]:h-5 [&_svg]:w-5">
      {children}
    </div>
  )
}

export default function ImportExportPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("import")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "export" || tab === "import") {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Import state: o OFX segue no diálogo antigo; a planilha abre o
  // assistente da importação completa (IMPCOMP-43)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isAssistenteOpen, setIsAssistenteOpen] = useState(false)

  // Additional Actions state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [guideActiveTab, setGuideActiveTab] = useState("ofx")

  // Export state: o formato em andamento mostra o carregamento no próprio botão
  const [exportando, setExportando] = useState<Formato | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    type: "ALL",
    categoryIds: [],
    accountId: "ALL",
    tagIds: [],
    classIds: []
  })

  // PERM-19 e PERM-26: cada importação e exportação segue a trava dela no
  // acesso do /auth/me; com a trava fechada, o botão dá lugar ao aviso

  const handleExport = async (format: Formato) => {
    try {
      setExportando(format)
      const blob = format === 'PDF'
        ? await importExportService.exportTransactionsPDF(filters)
        : await importExportService.exportTransactionsXLS(filters)

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `export_transacoes_${new Date().getTime()}.${format.toLowerCase() === 'xls' ? 'xlsx' : 'pdf'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast.success(`Exportação ${format} iniciada.`)
    } catch (error) {
      console.error(`Export ${format} failed`, error)
      toast.error("Não foi possível exportar. Verifique se há transações no período selecionado.")
    } finally {
      setExportando(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-8 md:px-6">

      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        type="OFX"
      />

      <AssistenteDePlanilha open={isAssistenteOpen} onOpenChange={setIsAssistenteOpen} />

      {/* Sheet para Histórico */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-fg-secondary" aria-hidden="true" />
              Histórico de Importações
            </SheetTitle>
            <SheetDescription>
              Suas últimas importações de extratos e planilhas.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center space-y-3 py-20 text-center">
            <Info className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Nenhuma importação recente.</p>
              <p className="text-xs text-muted-foreground">O histórico detalhado ainda não está disponível.</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog para Guia de Formatos */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-fg-secondary" aria-hidden="true" />
              Guia de Formatos Suportados
            </DialogTitle>
          </DialogHeader>

          <Tabs value={guideActiveTab} onValueChange={setGuideActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ofx">Padrão OFX</TabsTrigger>
              <TabsTrigger value="spreadsheet">Planilhas (CSV/XLSX)</TabsTrigger>
            </TabsList>

            <TabsContent value="ofx" className="space-y-4 pt-4">
              <h4 className="display-s">O que é OFX?</h4>
              <p className="text-sm leading-relaxed text-fg-secondary">
                O formato <strong>Open Financial Exchange (.ofx)</strong> é o padrão universal para extratos bancários.
                Ao exportar o extrato do seu banco tradicional ou digital, procure pela opção &ldquo;Exportar para OFX&rdquo; ou &ldquo;Money&rdquo;.
              </p>
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="label text-muted-foreground">Vantagens</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-fg-secondary">
                  <li>Importação automática sem mapeamento manual</li>
                  <li>Inclusão de IDs únicos (evita transações duplicadas)</li>
                  <li>Compatível com 99% dos bancos brasileiros</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="spreadsheet" className="space-y-4 pt-4">
              <h4 className="display-s">Planilhas Personalizadas</h4>
              <p className="text-sm leading-relaxed text-fg-secondary">
                Se você usa controle manual em Excel ou Google Sheets, pode importar seus dados via <strong>CSV ou XLSX</strong>.
              </p>
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="label text-muted-foreground">Estrutura mínima sugerida</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="label py-1 font-normal text-muted-foreground">Data</th>
                      <th className="label py-1 font-normal text-muted-foreground">Descrição</th>
                      <th className="label py-1 text-right font-normal text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="text-fg-secondary">
                    <tr>
                      <td className="py-2 font-mono">01/02/2026</td>
                      <td className="py-2">Mercado Central</td>
                      <td className="py-2 text-right font-mono tabular-nums">150.50</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                As abas, as colunas e as contas são reconhecidas automaticamente, inclusive na exportação do Mobills. Antes de gravar, você revisa tudo: ajusta as colunas, vincula ou cria as contas com o saldo atual e corrige ou exclui linhas.
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CabecalhoDePagina
        titulo="Importar"
        apoio="Extratos e planilhas"
        acoes={
          <>
            <Button variant="ghost" onClick={() => setIsHistoryOpen(true)}>
              <History aria-hidden="true" />
              Histórico de Importações
            </Button>
            <Button variant="ghost" onClick={() => setIsGuideOpen(true)}>
              <HelpCircle aria-hidden="true" />
              Guia de Formatos
            </Button>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="import" className="gap-2 px-4">
            <Upload className="h-4 w-4" aria-hidden="true" /> Importar
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2 px-4">
            <Download className="h-4 w-4" aria-hidden="true" /> Exportar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="p-5">
                <div className="flex items-center justify-between">
                  <IconeDoCard>
                    <FileText aria-hidden="true" />
                  </IconeDoCard>
                  <Badge variant="destino">Recomendado</Badge>
                </div>
                <CardTitle className="pt-3">Arquivos OFX</CardTitle>
                <CardDescription>
                  Ideal para extratos bancários padronizados.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <RecursoBloqueado chave="importacao_ofx" compacto>
                  <Button className="w-full" onClick={() => setIsImportDialogOpen(true)}>
                    Configurar Importação OFX
                  </Button>
                </RecursoBloqueado>
              </CardContent>
            </Card>

            {/* Card de planilhas: só CSV e XLSX (IMPORT-03) */}
            <Card>
              <CardHeader className="p-5">
                <IconeDoCard>
                  <TableIcon aria-hidden="true" />
                </IconeDoCard>
                <CardTitle className="pt-3">Planilhas (CSV/XLSX)</CardTitle>
                <CardDescription>
                  Abas, colunas e contas reconhecidas automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <RecursoBloqueado chave="importacao_planilha" compacto>
                  <Button variant="outline" className="w-full" onClick={() => setIsAssistenteOpen(true)}>
                    Importar Planilha
                  </Button>
                </RecursoBloqueado>
              </CardContent>
            </Card>
          </div>

          <Alert variant="info">
            <Info className="h-4 w-4" aria-hidden="true" />
            <div>
              <AlertTitle>Dica de Importação</AlertTitle>
              <AlertDescription>
                Arquivos OFX são processados automaticamente sem necessidade de mapeamento manual. Nas planilhas, as abas, as colunas e as contas são detectadas automaticamente, e você revisa tudo antes de importar.
              </AlertDescription>
            </div>
          </Alert>
        </TabsContent>

        <TabsContent value="export">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Exportar Dados</CardTitle>
                  <CardDescription>Refine as transações que deseja extrair do sistema.</CardDescription>
                </div>
                <TransactionFilters
                  currentFilters={filters}
                  onApplyFilters={setFilters}
                />
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 p-5 pt-0 md:grid-cols-2">
                <div className="space-y-4 rounded-md border border-border p-5">
                  <div className="flex items-center justify-between">
                    <IconeDoCard>
                      <FileText aria-hidden="true" />
                    </IconeDoCard>
                    <span className="label text-muted-foreground">Documento</span>
                  </div>
                  <div>
                    <h4 className="display-s">Relatório em PDF</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Ideal para impressão e conferência visual.</p>
                  </div>
                  <RecursoBloqueado chave="exportacao_pdf" compacto>
                    <Button
                      className="w-full"
                      onClick={() => handleExport('PDF')}
                      disabled={exportando !== null}
                      loading={exportando === 'PDF'}
                    >
                      Gerar PDF
                    </Button>
                  </RecursoBloqueado>
                </div>

                <div className="space-y-4 rounded-md border border-border p-5">
                  <div className="flex items-center justify-between">
                    <IconeDoCard>
                      <TableIcon aria-hidden="true" />
                    </IconeDoCard>
                    <span className="label text-muted-foreground">Planilha</span>
                  </div>
                  <div>
                    <h4 className="display-s">Dados em Excel (XLS)</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Ideal para análise profunda e manipulação.</p>
                  </div>
                  <RecursoBloqueado chave="exportacao_xlsx" compacto>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleExport('XLS')}
                      disabled={exportando !== null}
                      loading={exportando === 'XLS'}
                    >
                      Gerar XLS
                    </Button>
                  </RecursoBloqueado>
                </div>
              </CardContent>
            </Card>

            <Alert variant="info">
              <Info className="h-4 w-4" aria-hidden="true" />
              <div>
                <AlertTitle>Dica de Filtros</AlertTitle>
                <AlertDescription>
                  A exportação respeita exatamente os filtros aplicados. Você pode exportar apenas receitas de uma categoria específica ou gastos de um único cartão, por exemplo.
                </AlertDescription>
              </div>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
