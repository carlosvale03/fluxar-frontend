"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { 
  Download, 
  Upload, 
  FileText, 
  Table as TableIcon,
  ShieldAlert,
  HelpCircle,
  History,
  Info,
  Loader2
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
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
import Link from "next/link"

import { ImportDialog } from "@/components/transactions/import-dialog"
import { TransactionFilters, FilterState } from "@/components/transactions/transaction-filters"
import { startOfMonth, endOfMonth } from "date-fns"
import { importExportService } from "@/services/import-export"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export default function ImportExportPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("import")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "export" || tab === "import") {
      setActiveTab(tab)
    }
  }, [searchParams])
  
  // Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importType, setImportType] = useState<"OFX" | "SPREADSHEET">("OFX")

  // Additional Actions state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [guideActiveTab, setGuideActiveTab] = useState("ofx")

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    type: "ALL",
    categoryId: "ALL",
    accountId: "ALL",
    tagIds: []
  })
  
  const isPremium = user?.plan === 'PREMIUM' || user?.plan === 'PREMIUM_PLUS'

  const handleOpenImport = (type: "OFX" | "SPREADSHEET") => {
    setImportType(type)
    setIsImportDialogOpen(true)
  }

  const handleExport = async (format: 'PDF' | 'XLS') => {
    try {
      setIsExporting(true)
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
      
      toast.success(`Exportação ${format} iniciada!`)
    } catch (error) {
      console.error(`Export ${format} failed`, error)
      toast.error(`Sugestão: Verifique se existem transações no período selecionado.`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <ImportDialog 
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        type={importType}
      />

      {/* Sheet para Histórico */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle className="font-black uppercase tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Importações
            </SheetTitle>
            <SheetDescription className="font-medium text-xs">
              Visualize suas últimas movimentações de dados externos.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 rounded-full bg-muted/50 text-muted-foreground animate-pulse">
              <Info className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm">Nenhuma importação recente encontrada.</p>
              <p className="text-xs text-muted-foreground">O histórico detalhado de logs será implementado em breve.</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog para Guia de Formatos */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Guia de Formatos Suportados
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={guideActiveTab} onValueChange={setGuideActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl h-auto">
              <TabsTrigger value="ofx" className="font-bold rounded-lg py-1.5 data-[state=active]:bg-background">Padrão OFX</TabsTrigger>
              <TabsTrigger value="spreadsheet" className="font-bold rounded-lg py-1.5 data-[state=active]:bg-background">Planilhas (CSV/XLS)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ofx" className="pt-4 space-y-4">
              <h4 className="font-bold text-sm text-primary uppercase tracking-wider">O que é OFX?</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                O formato <strong>Open Financial Exchange (.ofx)</strong> é o padrão universal para extratos bancários. 
                Ao exportar o extrato do seu banco tradicional ou digital, procure pela opção "Exportar para OFX" ou "Money".
              </p>
              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Vantagens</p>
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground font-medium">
                  <li>Importação automática sem mapeamento manual</li>
                  <li>Inclusão de IDs únicos (evita transações duplicadas)</li>
                  <li>Compatível com 99% dos bancos brasileiros</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="spreadsheet" className="pt-4 space-y-4">
              <h4 className="font-bold text-sm text-blue-500 uppercase tracking-wider">Planilhas Personalizadas</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Se você usa controle manual em Excel ou Google Sheets, pode importar seus dados via <strong>CSV, XLS ou XLSX</strong>.
              </p>
              <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">Estrutura mínima sugerida</p>
                <table className="text-xs w-full">
                  <thead className="opacity-50 text-[10px]">
                    <tr className="border-b border-border/40 text-left">
                      <th className="py-1">Data</th>
                      <th className="py-1">Descrição</th>
                      <th className="py-1">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-muted-foreground">
                    <tr>
                      <td className="py-2">01/02/2026</td>
                      <td className="py-2">Mercado Central</td>
                      <td className="py-2">150.50</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] italic text-muted-foreground">
                * No momento da importação, você poderá mapear qual coluna da sua planilha corresponde a cada campo do Fluxar.
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Importação & Exportação</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Gerencie seus dados e movimentações externas.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="import" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex gap-2">
            <Upload className="h-4 w-4" /> Importar
          </TabsTrigger>
          <TabsTrigger value="export" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex gap-2">
            <Download className="h-4 w-4" /> Exportar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/60 bg-card rounded-3xl shadow-sm hover:bg-muted/30 hover:border-primary/20 hover:shadow-md transition-all group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Recomendado</Badge>
                </div>
                <CardTitle className="mt-4 font-black uppercase tracking-tight">Arquivos OFX</CardTitle>
                <CardDescription className="text-xs font-medium">
                  Ideal para extratos bancários padronizados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                    className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-12 shadow-md shadow-primary/20"
                    onClick={() => handleOpenImport("OFX")}
                >
                  Configurar Importação OFX
                </Button>
              </CardContent>
            </Card>

            {/* CSV/XLS Card */}
            <Card className="border-border/60 bg-card rounded-3xl shadow-sm hover:bg-muted/30 hover:border-blue-500/20 hover:shadow-md transition-all group">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                    <TableIcon className="h-6 w-6" />
                  </div>
                </div>
                <CardTitle className="mt-4 font-black uppercase tracking-tight">Planilhas (CSV/XLS)</CardTitle>
                <CardDescription className="text-xs font-medium">
                  Suporte flexível para planilhas personalizadas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                    variant="outline" 
                    className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-12 border-blue-500/20 hover:bg-blue-500/10 text-blue-500"
                    onClick={() => handleOpenImport("SPREADSHEET")}
                >
                  Mapear Colunas e Importar
                </Button>
              </CardContent>
            </Card>
          </div>

          <Alert className="bg-primary/5 border-primary/10 rounded-3xl flex items-start gap-4 p-4 mt-8">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <AlertTitle className="font-bold text-sm text-primary mb-1">Dica de Importação</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed text-primary/80">
                Arquivos OFX são processados automaticamente sem necessidade de mapeamento manual. Para planilhas, você poderá escolher quais colunas representam data, valor e descrição.
              </AlertDescription>
            </div>
          </Alert>
        </TabsContent>

        <TabsContent value="export" className="animate-in fade-in slide-in-from-right-2 duration-300">
          {!isPremium ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 bg-muted/20 rounded-[40px] border border-dashed border-border/40">
              <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/10 animate-pulse">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Recurso Exclusivo</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  A exportação detalhada de dados em PDF e XLS está disponível apenas para assinantes **Premium** e **Premium Plus**.
                </p>
              </div>
              <Button asChild className="rounded-full font-black uppercase tracking-widest text-[10px] px-8 h-12 bg-amber-500 hover:bg-amber-600 border-0 shadow-lg shadow-amber-500/20 text-white">
                <Link href="/perfil">Seja Premium Agora</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="border-border/60 bg-card shadow-sm md:rounded-[40px]">
                <CardHeader className="flex flex-row items-center justify-between pb-8">
                  <div className="space-y-1">
                    <CardTitle className="font-black uppercase tracking-tight">Exportar Dados</CardTitle>
                    <CardDescription className="text-xs font-medium">Refine as transações que deseja extrair do sistema.</CardDescription>
                  </div>
                  <TransactionFilters 
                    currentFilters={filters}
                    onApplyFilters={setFilters}
                  />
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="p-6 rounded-[32px] bg-muted/20 border border-border/40 space-y-6 hover:border-primary/20 hover:bg-muted/30 transition-all group">
                     <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                           <FileText className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Documento</span>
                     </div>
                     <div>
                        <h4 className="font-black uppercase tracking-tight">Relatório em PDF</h4>
                        <p className="text-xs text-muted-foreground mt-1">Ideal para impressão e conferência visual.</p>
                     </div>
                     <Button 
                        className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-12"
                        onClick={() => handleExport('PDF')}
                        disabled={isExporting}
                     >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Gerar PDF"}
                     </Button>
                  </div>

                  <div className="p-6 rounded-[32px] bg-muted/20 border border-border/40 space-y-6 hover:border-blue-500/20 hover:bg-muted/30 transition-all group">
                     <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                           <TableIcon className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Planilha</span>
                     </div>
                     <div>
                        <h4 className="font-black uppercase tracking-tight">Dados em Excel (XLS)</h4>
                        <p className="text-xs text-muted-foreground mt-1">Ideal para análise profunda e manipulação.</p>
                     </div>
                     <Button 
                        variant="outline" 
                        className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-12 border-blue-500/20 hover:bg-blue-500/10 text-blue-500"
                        onClick={() => handleExport('XLS')}
                        disabled={isExporting}
                     >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Gerar XLS"}
                     </Button>
                  </div>
                </CardContent>
              </Card>

              <Alert className="bg-blue-500/5 border-blue-500/10 rounded-3xl flex items-start gap-4 p-4 mt-8">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <AlertTitle className="font-bold text-sm text-blue-500 mb-1">Dica de Filtros</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed text-blue-500/80">
                    A exportação respeita exatamente os filtros aplicados. Você pode exportar apenas receitas de uma categoria específica ou gastos de um único cartão, por exemplo.
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center gap-8 text-muted-foreground">
         <div 
          className="flex items-center gap-2 group cursor-pointer"
          onClick={() => setIsHistoryOpen(true)}
         >
            <History className="h-4 w-4 group-hover:text-primary transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest">Histórico de Importações</span>
         </div>
         <div 
          className="flex items-center gap-2 group cursor-pointer"
          onClick={() => setIsGuideOpen(true)}
         >
            <HelpCircle className="h-4 w-4 group-hover:text-primary transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest">Guia de Formatos</span>
         </div>
      </div>
    </div>
  )
}
