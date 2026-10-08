"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { 
  Loader2, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  FileText,
  Table as TableIcon,
  Info,
  ArrowRight,
  ArrowLeft,
  RefreshCcw,
  Users
} from "lucide-react"
import { api } from "@/services/apiClient"
import { Account } from "@/types/accounts"
import { importExportService, ImportSummary, SpreadsheetMapping } from "@/services/import-export"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { tratarErro } from "@/lib/erros"

// IMPORT-02 a IMPORT-04: as mesmas mensagens do backend. A conferência local
// só evita o envio; um 400 do backend vai por tratarErro.
export const FORMATO_NAO_SUPORTADO = "Formato não suportado. Envie um arquivo OFX, CSV ou XLSX."
export const ARQUIVO_GRANDE_DEMAIS = "O arquivo passa do limite de 5 MB."
const LIMITE_DE_BYTES = 5 * 1024 * 1024
const EXTENSOES = { OFX: ["ofx"], SPREADSHEET: ["csv", "xlsx"] } as const
const ACEITOS = { OFX: ".ofx", SPREADSHEET: ".csv,.xlsx" } as const

// Colunas que cada tipo de importação lê (as mesmas do backend)
const COLUNAS_DO_TIPO: Record<"INCOME_EXPENSE" | "TRANSFER", (keyof SpreadsheetMapping)[]> = {
  INCOME_EXPENSE: [
    "date_column", "description_column", "amount_column", "type_column", "status_column",
    "category_column", "subcategory_column", "tags_column", "account_column",
  ],
  TRANSFER: ["date_column", "amount_column", "source_account_column", "dest_account_column", "tags_column"],
}

// IMPORT-06: o backend recusa coluna mapeada que não existe no arquivo, então
// só vão as colunas do tipo que o usuário preencheu
export function mapeamentoDoEnvio(
  mapping: SpreadsheetMapping,
  tipo: "INCOME_EXPENSE" | "TRANSFER",
): SpreadsheetMapping {
  const enviado: Partial<SpreadsheetMapping> = {}
  for (const campo of COLUNAS_DO_TIPO[tipo]) {
    const coluna = mapping[campo]?.trim()
    if (coluna) enviado[campo] = coluna
  }
  return enviado as SpreadsheetMapping
}

// IMPORT-45: "1 linha com categoria sugerida" e "N linhas com categoria sugerida"
export function textoDasSugeridas(quantidade: number): string {
  return quantidade === 1
    ? "1 linha com categoria sugerida"
    : `${quantidade} linhas com categoria sugerida`
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "OFX" | "SPREADSHEET"
}

type ImportStep = "CONFIG" | "MAPPING" | "ACCOUNT_ASSOCIATION" | "SUMMARY"
type ImportSubType = "INCOME_EXPENSE" | "TRANSFER"

export function ImportDialog({ open, onOpenChange, type }: ImportDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [step, setStep] = useState<ImportStep>("CONFIG")
  const [importSubType, setImportSubType] = useState<ImportSubType>("INCOME_EXPENSE")
  
  // Spreadsheet mapping state: as obrigatórias com o nome usual e as
  // opcionais vazias, enviadas só se o usuário preencher (IMPORT-06)
  const [mapping, setMapping] = useState<SpreadsheetMapping>({
    date_column: "Data",
    description_column: "Descrição",
    amount_column: "Valor",
    type_column: "",
    status_column: "",
    category_column: "",
    subcategory_column: "",
    tags_column: "",
    account_column: "",
    source_account_column: "Conta origem",
    dest_account_column: "Conta destino"
  })

  // Account mapping state
  const [uniqueSpreadsheetAccounts, setUniqueSpreadsheetAccounts] = useState<string[]>([])
  const [accountMapping, setAccountMapping] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      fetchAccounts()
      resetState()
    }
  }, [open])

  const resetState = () => {
    setFile(null)
    setSummary(null)
    setSelectedAccountId("")
    setStep("CONFIG")
    setImportSubType("INCOME_EXPENSE")
    setUniqueSpreadsheetAccounts([])
    setAccountMapping({})
  }

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/accounts/")
      setAccounts(response.data)
    } catch (error) {
      // CONTRATO-33: nenhuma falha silenciosa
      tratarErro(error, { mensagemPadrao: "Erro ao carregar contas.", tentarDeNovo: fetchAccounts })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    if (!selectedFile) return

    // IMPORT-03: OFX aceita .ofx; planilha, só .csv e .xlsx
    const extension = selectedFile.name.split('.').pop()?.toLowerCase() ?? ""
    const allowedExtensions: readonly string[] = EXTENSOES[type]

    if (!allowedExtensions.includes(extension)) {
      toast.error(FORMATO_NAO_SUPORTADO)
      e.target.value = ""
      setFile(null)
      return
    }

    if (selectedFile.size > LIMITE_DE_BYTES) {
      toast.error(ARQUIVO_GRANDE_DEMAIS)
      e.target.value = ""
      setFile(null)
      return
    }

    setFile(selectedFile)
  }

  const goToMapping = () => {
    if (!file) {
      toast.error("Selecione um arquivo.")
      return
    }
    if (type === "OFX") {
        if (!selectedAccountId) {
            toast.error("Selecione a conta de destino.")
            return
        }
        handleImport()
        return
    }
    setStep("MAPPING")
  }

  const handlePreflight = async () => {
    if (!file) return
    
    // Validação básica de colunas
    if (!mapping.date_column || !mapping.amount_column) {
      toast.error("Data e Valor são colunas obrigatórias.")
      return
    }
    
    if (importSubType === "INCOME_EXPENSE" && !mapping.description_column) {
      toast.error("Descrição é obrigatória para Receitas/Despesas.")
      return
    }

    if (importSubType === "TRANSFER" && (!mapping.source_account_column || !mapping.dest_account_column)) {
      toast.error("Conta de Origem e Destino são obrigatórias para Transferências.")
      return
    }

    try {
      setIsLoading(true)
      const result = await importExportService.preflightSpreadsheet(
        file, mapeamentoDoEnvio(mapping, importSubType), importSubType
      )

      if (result.accounts.length === 0 && importSubType === "INCOME_EXPENSE" && selectedAccountId) {
        // Sem coluna de conta: todas as linhas vão para a conta padrão
        await handleImport()
      } else if (result.accounts.length > 0) {
        setUniqueSpreadsheetAccounts(result.accounts)
        const initialMapping: Record<string, string> = {}
        result.accounts.forEach(acc => {
            const match = accounts.find(a => a.name.toLowerCase() === acc.toLowerCase())
            if (match) initialMapping[acc] = match.id
        })
        setAccountMapping(initialMapping)
        setStep("ACCOUNT_ASSOCIATION")
      } else {
        toast.error("Nenhuma conta encontrada na planilha. Verifique o mapeamento das colunas.")
      }
    } catch (error) {
      // CONTRATO-30 e CONTRATO-31: a API não usa mais a chave error
      tratarErro(error, { mensagemPadrao: "Erro ao processar planilha." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return;
    
    // Validação de segurança: se for receita/despesa, precisa ou de uma conta selecionada ou de uma coluna de conta mapeada
    if (importSubType === "INCOME_EXPENSE" && !selectedAccountId && !mapping.account_column) {
      toast.error("Selecione uma conta padrão ou informe a coluna de 'Conta' no mapeamento.")
      return
    }

    try {
      setIsLoading(true)
      let result: ImportSummary

      if (type === "OFX") {
        result = await importExportService.importOFX(file, selectedAccountId)
      } else {
        result = await importExportService.importSpreadsheet(
            file, 
            selectedAccountId, 
            mapeamentoDoEnvio(mapping, importSubType),
            importSubType, 
            accountMapping
        )
      }

      setSummary(result)
      setStep("SUMMARY")
      toast.success("Processamento concluído!")
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao importar dados." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-[32px] border-border/60 bg-card shadow-2xl overflow-hidden p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-primary/10 text-primary">
                {type === "OFX" ? <FileText className="h-6 w-6" /> : <TableIcon className="h-6 w-6" />}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {step === "SUMMARY" ? "Importação Concluída" : `Importar ${type}`}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
                  {step === "CONFIG" && "Escolha o arquivo e o tipo de movimentação."}
                  {step === "MAPPING" && "Identifique as colunas da sua planilha."}
                  {step === "ACCOUNT_ASSOCIATION" && "Associe as contas da planilha com as do sistema."}
                  {step === "SUMMARY" && "Resumo do processamento de dados."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar space-y-6 py-2">
          
          {/* STEP 1: CONFIG */}
          {step === "CONFIG" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {type === "SPREADSHEET" && (
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Tipo de Importação</Label>
                    <Tabs value={importSubType} onValueChange={(v) => setImportSubType(v as ImportSubType)} className="w-full">
                        <TabsList className="grid grid-cols-2 h-12 bg-muted/20 rounded-2xl p-1 border border-border/40">
                            <TabsTrigger value="INCOME_EXPENSE" className="rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Receitas / Despesas</TabsTrigger>
                            <TabsTrigger value="TRANSFER" className="rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Transferências</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
              )}

              {type === "OFX" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">
                      Conta de Destino
                  </Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/5 border-border/40 font-bold">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id} className="rounded-xl font-bold">{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="arquivo-da-importacao" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Arquivo ({type === "OFX" ? ".ofx" : ".csv, .xlsx"})</Label>
                <Input
                  id="arquivo-da-importacao"
                  type="file"
                  accept={ACEITOS[type]}
                  className="h-12 rounded-2xl bg-muted/5 border-border/40 font-bold file:bg-primary file:text-primary-foreground file:font-black file:uppercase file:text-[10px] file:tracking-widest file:rounded-xl file:border-0 file:mr-4 file:px-4 file:h-full cursor-pointer p-0"
                  onChange={handleFileChange}
                />
              </div>

              <Button 
                className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-14 shadow-xl shadow-primary/20 transition-all active:scale-95"
                onClick={goToMapping}
                disabled={!file || (type === "OFX" && !selectedAccountId)}
              >
                {type === "OFX" ? "Processar Arquivo" : "Próximo Passo"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === "MAPPING" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Mapeamento de Colunas</h4>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 leading-tight pl-3.5 font-medium">
                    Identifique o nome exato das colunas na sua planilha.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Data *</Label>
                      <Input value={mapping.date_column} onChange={e => setMapping({...mapping, date_column: e.target.value})} className="h-10 rounded-xl font-bold text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Valor *</Label>
                      <Input value={mapping.amount_column} onChange={e => setMapping({...mapping, amount_column: e.target.value})} className="h-10 rounded-xl font-bold text-xs" />
                    </div>

                    {importSubType === "INCOME_EXPENSE" ? (
                        <>
                            <div className="col-span-full space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Descrição *</Label>
                                <Input value={mapping.description_column} onChange={e => setMapping({...mapping, description_column: e.target.value})} className="h-10 rounded-xl font-bold text-xs" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Conta Origem *</Label>
                                <Input value={mapping.source_account_column} onChange={e => setMapping({...mapping, source_account_column: e.target.value})} className="h-10 rounded-xl font-bold text-xs" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Conta Destino *</Label>
                                <Input value={mapping.dest_account_column} onChange={e => setMapping({...mapping, dest_account_column: e.target.value})} className="h-10 rounded-xl font-bold text-xs" />
                            </div>
                        </>
                    )}
                </div>

                {importSubType === "INCOME_EXPENSE" && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Coluna de Tipo</Label>
                                <Input value={mapping.type_column} onChange={e => setMapping({...mapping, type_column: e.target.value})} placeholder="Tipo (Receita/Despesa)" className="h-10 rounded-xl font-bold text-xs" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Coluna de Situação</Label>
                                <Input value={mapping.status_column} onChange={e => setMapping({...mapping, status_column: e.target.value})} placeholder="Situação" className="h-10 rounded-xl font-bold text-xs" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Coluna de Categoria</Label>
                                <Input value={mapping.category_column} onChange={e => setMapping({...mapping, category_column: e.target.value})} placeholder="Categoria" className="h-10 rounded-xl font-bold text-xs" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Coluna de Subcategoria</Label>
                                <Input value={mapping.subcategory_column} onChange={e => setMapping({...mapping, subcategory_column: e.target.value})} placeholder="Subcategoria" className="h-10 rounded-xl font-bold text-xs" />
                            </div>
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Coluna de Tags</Label>
                        <Input value={mapping.tags_column} onChange={e => setMapping({...mapping, tags_column: e.target.value})} placeholder="Tags" className="h-10 rounded-xl font-bold text-xs" />
                    </div>
                    {importSubType === "INCOME_EXPENSE" && (
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Coluna de Conta</Label>
                            <Input value={mapping.account_column} onChange={e => setMapping({...mapping, account_column: e.target.value})} placeholder="Nome da Conta" className="h-10 rounded-xl font-bold text-xs" />
                        </div>
                    )}
                </div>

                {/* IMPORT-22: sem coluna de conta, as linhas vão para a conta padrão */}
                {importSubType === "INCOME_EXPENSE" && (
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Conta padrão (linhas sem conta)</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger className="h-10 rounded-xl border-border/40 font-bold text-xs">
                                <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id} className="rounded-lg font-bold text-xs">{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-full font-black uppercase text-[10px] h-12" onClick={() => setStep("CONFIG")}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <Button className="flex-[2] rounded-full font-black uppercase text-[10px] h-12 shadow-lg shadow-primary/20" onClick={handlePreflight} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Analisar Planilha"}
                    </Button>
                </div>
            </div>
          )}

          {/* STEP 3: ACCOUNT ASSOCIATION */}
          {step === "ACCOUNT_ASSOCIATION" && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
                    <Users className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold text-amber-700">Associação de Contas</h4>
                        <p className="text-[10px] text-amber-600 font-medium">Identificamos {uniqueSpreadsheetAccounts.length} contas diferentes na sua planilha. Associe-as às contas do sistema.</p>
                    </div>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
                    {uniqueSpreadsheetAccounts.map((accName) => (
                        <div key={accName} className="p-3 rounded-2xl bg-muted/5 border border-border/40 flex flex-col gap-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground/60">{accName}</Label>
                            <Select 
                                value={accountMapping[accName] || ""} 
                                onValueChange={(val) => setAccountMapping({...accountMapping, [accName]: val})}
                            >
                                <SelectTrigger className="h-10 rounded-xl border-border/40 font-bold text-xs">
                                    <SelectValue placeholder="Escolha a conta no sistema" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id} className="rounded-lg font-bold text-xs">{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-full font-black uppercase text-[10px] h-12" onClick={() => setStep("MAPPING")}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <Button 
                        className="flex-[2] rounded-full font-black uppercase text-[10px] h-12 shadow-lg shadow-primary/20" 
                        onClick={handleImport}
                        disabled={isLoading || (importSubType === "TRANSFER" && Object.keys(accountMapping).length < 1)}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                        {isLoading ? "Processando..." : "Finalizar Importação"}
                    </Button>
                </div>
             </div>
          )}

          {/* STEP 4: SUMMARY: lidas, gravadas, ignoradas e rejeitadas (IMPORT-33) */}
          {step === "SUMMARY" && summary && (
             <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-3xl bg-muted border border-border text-center space-y-1">
                    <div className="h-5 flex items-center justify-center font-black opacity-30">Σ</div>
                    <p className="text-2xl font-black text-foreground leading-none">{summary.total}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Lidas</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                    <p className="text-2xl font-black text-emerald-600 leading-none">{summary.imported}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70">Gravadas</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
                    <AlertCircle className="h-5 w-5 text-blue-500 mx-auto" />
                    <p className="text-2xl font-black text-blue-600 leading-none">{summary.ignored}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-600/70">Ignoradas</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-1">
                    <XCircle className="h-5 w-5 text-rose-500 mx-auto" />
                    <p className="text-2xl font-black text-rose-600 leading-none">{summary.rejected}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/70">Rejeitadas</p>
                    </div>
                </div>

                {/* IMPORT-45: as sugeridas, com o atalho para a lista filtrada */}
                {summary.suggested > 0 && (
                  <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-primary">{textoDasSugeridas(summary.suggested)}</p>
                    <Link
                      href={`/transacoes?import_batch=${encodeURIComponent(summary.batch_id)}&suggested_category=true`}
                      onClick={() => onOpenChange(false)}
                      className="text-[10px] font-black uppercase tracking-widest text-primary underline-offset-4 hover:underline shrink-0"
                    >
                      Revisar sugeridas
                    </Link>
                  </div>
                )}

                {/* IMPORT-30: cada rejeitada com o número no arquivo e o motivo */}
                {summary.rejected_rows.length > 0 && (
                  <div className="p-4 rounded-3xl bg-rose-500/5 border border-rose-500/10 space-y-2">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-rose-600 px-1">Linhas rejeitadas</h5>
                    <div className="max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                        <ul className="space-y-1">
                            {summary.rejected_rows.map((linha) => (
                                <li key={linha.line} className="text-[9px] font-medium text-rose-500/80 leading-tight flex gap-2">
                                    <span className="shrink-0">•</span>
                                    <span>Linha {linha.line}: {linha.reason}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                  </div>
                )}

                <Button 
                    className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-14 bg-primary"
                    onClick={() => onOpenChange(false)}
                >
                    Fechar e Ver Dashboard
                </Button>
             </div>
          )}

        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
