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
      toast.success("Processamento concluído.")
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao importar dados." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] overflow-hidden p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-fg-secondary">
                {type === "OFX" ? <FileText className="h-5 w-5" /> : <TableIcon className="h-5 w-5" />}
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle>
                  {step === "SUMMARY" ? "Importação Concluída" : `Importar ${type}`}
                </DialogTitle>
                <DialogDescription>
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
            <div className="space-y-6 animate-in fade-in duration-base">
              {type === "SPREADSHEET" && (
                <div className="space-y-3">
                    <Label>Tipo de Importação</Label>
                    <Tabs value={importSubType} onValueChange={(v) => setImportSubType(v as ImportSubType)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="INCOME_EXPENSE">Receitas / Despesas</TabsTrigger>
                            <TabsTrigger value="TRANSFER">Transferências</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
              )}

              {type === "OFX" && (
                <div className="space-y-2">
                  <Label htmlFor="conta-do-ofx">
                      Conta de Destino
                  </Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger id="conta-do-ofx">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="arquivo-da-importacao">Arquivo ({type === "OFX" ? ".ofx" : ".csv, .xlsx"})</Label>
                <Input
                  id="arquivo-da-importacao"
                  type="file"
                  accept={ACEITOS[type]}
                  className="cursor-pointer py-1.5 file:mr-3 file:cursor-pointer file:rounded-sm file:border file:border-border-strong file:bg-transparent file:px-3 file:text-sm file:font-medium file:text-foreground"
                  onChange={handleFileChange}
                />
              </div>

              <Button
                className="w-full"
                onClick={goToMapping}
                disabled={!file || (type === "OFX" && !selectedAccountId)}
              >
                {type === "OFX" ? "Processar Arquivo" : "Próximo Passo"}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === "MAPPING" && (
            <div className="space-y-6 animate-in fade-in duration-base">
               <div className="flex flex-col gap-1">
                  <h4 className="label text-muted-foreground">Mapeamento de Colunas</h4>
                  <p className="text-sm text-fg-secondary">
                    Identifique o nome exato das colunas na sua planilha.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="coluna-date">Data *</Label>
                      <Input id="coluna-date" value={mapping.date_column} onChange={e => setMapping({...mapping, date_column: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="coluna-amount">Valor *</Label>
                      <Input id="coluna-amount" value={mapping.amount_column} onChange={e => setMapping({...mapping, amount_column: e.target.value})} />
                    </div>

                    {importSubType === "INCOME_EXPENSE" ? (
                        <>
                            <div className="col-span-full space-y-1.5">
                                <Label htmlFor="coluna-description">Descrição *</Label>
                                <Input id="coluna-description" value={mapping.description_column} onChange={e => setMapping({...mapping, description_column: e.target.value})} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="coluna-source-account">Conta Origem *</Label>
                                <Input id="coluna-source-account" value={mapping.source_account_column} onChange={e => setMapping({...mapping, source_account_column: e.target.value})} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="coluna-dest-account">Conta Destino *</Label>
                                <Input id="coluna-dest-account" value={mapping.dest_account_column} onChange={e => setMapping({...mapping, dest_account_column: e.target.value})} />
                            </div>
                        </>
                    )}
                </div>

                {importSubType === "INCOME_EXPENSE" && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="coluna-type">Coluna de Tipo</Label>
                                <Input id="coluna-type" value={mapping.type_column} onChange={e => setMapping({...mapping, type_column: e.target.value})} placeholder="Tipo (Receita/Despesa)" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="coluna-status">Coluna de Situação</Label>
                                <Input id="coluna-status" value={mapping.status_column} onChange={e => setMapping({...mapping, status_column: e.target.value})} placeholder="Situação" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="coluna-category">Coluna de Categoria</Label>
                                <Input id="coluna-category" value={mapping.category_column} onChange={e => setMapping({...mapping, category_column: e.target.value})} placeholder="Categoria" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="coluna-subcategory">Coluna de Subcategoria</Label>
                                <Input id="coluna-subcategory" value={mapping.subcategory_column} onChange={e => setMapping({...mapping, subcategory_column: e.target.value})} placeholder="Subcategoria" />
                            </div>
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="coluna-tags">Coluna de Tags</Label>
                        <Input id="coluna-tags" value={mapping.tags_column} onChange={e => setMapping({...mapping, tags_column: e.target.value})} placeholder="Tags" />
                    </div>
                    {importSubType === "INCOME_EXPENSE" && (
                        <div className="space-y-1.5">
                            <Label htmlFor="coluna-account">Coluna de Conta</Label>
                            <Input id="coluna-account" value={mapping.account_column} onChange={e => setMapping({...mapping, account_column: e.target.value})} placeholder="Nome da Conta" />
                        </div>
                    )}
                </div>

                {/* IMPORT-22: sem coluna de conta, as linhas vão para a conta padrão */}
                {importSubType === "INCOME_EXPENSE" && (
                    <div className="space-y-1.5">
                        <Label>Conta padrão (linhas sem conta)</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("CONFIG")}>
                        <ArrowLeft aria-hidden="true" /> Voltar
                    </Button>
                    <Button className="flex-[2]" onClick={handlePreflight} loading={isLoading}>
                        Analisar Planilha
                    </Button>
                </div>
            </div>
          )}

          {/* STEP 3: ACCOUNT ASSOCIATION */}
          {step === "ACCOUNT_ASSOCIATION" && (
             <div className="space-y-6 animate-in fade-in duration-base">
                <div className="flex gap-3 rounded-sm border border-l-[3px] border-border border-l-info bg-card p-4">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                    <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">Associação de Contas</h4>
                        <p className="text-sm text-fg-secondary">Identificamos{uniqueSpreadsheetAccounts.length} contas diferentes na sua planilha. Associe-as às contas do sistema.</p>
                    </div>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
                    {uniqueSpreadsheetAccounts.map((accName) => (
                        <div key={accName} className="p-3 rounded-lg border border-border flex flex-col gap-2">
                            <Label>{accName}</Label>
                            <Select 
                                value={accountMapping[accName] || ""} 
                                onValueChange={(val) => setAccountMapping({...accountMapping, [accName]: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Escolha a conta no sistema" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("MAPPING")}>
                        <ArrowLeft aria-hidden="true" /> Voltar
                    </Button>
                    <Button
                        className="flex-[2]"
                        onClick={handleImport}
                        disabled={isLoading || (importSubType === "TRANSFER" && Object.keys(accountMapping).length < 1)}
                    >
                        {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCcw aria-hidden="true" />}
                        {isLoading ? "Processando..." : "Finalizar Importação"}
                    </Button>
                </div>
             </div>
          )}

          {/* STEP 4: SUMMARY: lidas, gravadas, ignoradas e rejeitadas (IMPORT-33) */}
          {step === "SUMMARY" && summary && (
             <div className="animate-in fade-in duration-base space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 rounded-lg border border-border p-4 text-center">
                    <div aria-hidden="true" className="flex h-5 items-center justify-center text-muted-foreground">Σ</div>
                    <p className="value-l">{summary.total}</p>
                    <p className="label text-muted-foreground">Lidas</p>
                    </div>
                    <div className="space-y-1 rounded-lg border border-border p-4 text-center">
                    <CheckCircle2 className="mx-auto h-5 w-5 text-inflow" aria-hidden="true" />
                    <p className="value-l text-inflow">{summary.imported}</p>
                    <p className="label text-muted-foreground">Gravadas</p>
                    </div>
                    <div className="space-y-1 rounded-lg border border-border p-4 text-center">
                    <AlertCircle className="mx-auto h-5 w-5 text-info" aria-hidden="true" />
                    <p className="value-l text-info">{summary.ignored}</p>
                    <p className="label text-muted-foreground">Ignoradas</p>
                    </div>
                    <div className="space-y-1 rounded-lg border border-border p-4 text-center">
                    <XCircle className="mx-auto h-5 w-5 text-outflow" aria-hidden="true" />
                    <p className="value-l text-outflow">{summary.rejected}</p>
                    <p className="label text-muted-foreground">Rejeitadas</p>
                    </div>
                </div>

                {/* IMPORT-45: as sugeridas, com o atalho para a lista filtrada */}
                {summary.suggested > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-sm border border-l-[3px] border-border border-l-info bg-card p-4">
                    <p className="text-sm text-fg-secondary">{textoDasSugeridas(summary.suggested)}</p>
                    <Link
                      href={`/transacoes?import_batch=${encodeURIComponent(summary.batch_id)}&suggested_category=true`}
                      onClick={() => onOpenChange(false)}
                      className="shrink-0 text-sm font-medium text-gold-line underline-offset-4 hover:underline"
                    >
                      Revisar sugeridas →
                    </Link>
                  </div>
                )}

                {/* IMPORT-30: cada rejeitada com o número no arquivo e o motivo */}
                {summary.rejected_rows.length > 0 && (
                  <div className="space-y-2 rounded-sm border border-l-[3px] border-border border-l-outflow bg-card p-4">
                    <h5 className="label text-outflow">Linhas rejeitadas</h5>
                    <div className="max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                        <ul className="space-y-1">
                            {summary.rejected_rows.map((linha) => (
                                <li key={linha.line} className="flex gap-2 text-sm text-fg-secondary">
                                    <span className="shrink-0" aria-hidden="true">•</span>
                                    <span>Linha {linha.line}: {linha.reason}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                  </div>
                )}

                <Button
                    className="w-full"
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
