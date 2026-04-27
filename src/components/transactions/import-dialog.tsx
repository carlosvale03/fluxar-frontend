"use client"

import { useState, useEffect } from "react"
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
  Info
} from "lucide-react"
import { api } from "@/services/apiClient"
import { Account } from "@/types/accounts"
import { importExportService, ImportSummary } from "@/services/import-export"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "OFX" | "SPREADSHEET"
}

export function ImportDialog({ open, onOpenChange, type }: ImportDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  
  // Spreadsheet mapping state
  const [mapping, setMapping] = useState({
    date_column: "",
    description_column: "",
    amount_column: "",
    type_column: "",
    status_column: "",
    category_column: "",
    subcategory_column: "",
    tags_column: "",
    account_column: ""
  })

  useEffect(() => {
    if (open) {
      fetchAccounts()
      // Reset state
      setFile(null)
      setSummary(null)
      setSelectedAccountId("")
    }
  }, [open])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/accounts/")
      setAccounts(response.data.results || response.data || [])
    } catch (error) {
      console.error("Failed to fetch accounts", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    if (!selectedFile) return

    // 1. Validate Extension
    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = type === "OFX" ? ["ofx"] : ["csv", "xls", "xlsx"]
    
    if (!extension || !allowedExtensions.includes(extension)) {
      toast.error(`Extensão .${extension} não permitida para importação ${type}.`)
      e.target.value = "" // Clear input
      setFile(null)
      return
    }

    // 2. Validate Size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. O limite é 5MB.")
      e.target.value = ""
      setFile(null)
      return
    }

    setFile(selectedFile)
  }

  const handleImport = async () => {
    if (!file || !selectedAccountId) {
      toast.error("Selecione um arquivo e uma conta destino.")
      return
    }

    try {
      setIsLoading(true)
      let result: ImportSummary

      if (type === "OFX") {
        result = await importExportService.importOFX(file, selectedAccountId)
      } else {
        if (!mapping.date_column || !mapping.description_column || !mapping.amount_column) {
          toast.error("Preencha o mapeamento obrigatório das colunas.")
          setIsLoading(false)
          return
        }
        result = await importExportService.importSpreadsheet(file, selectedAccountId, mapping)
      }

      setSummary(result)
      toast.success("Importação concluída!")
    } catch (error: any) {
      console.error("Import failed", error)
      toast.error(error.response?.data?.detail || "Erro ao processar importação.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[32px] border-border/60 bg-card shadow-2xl overflow-hidden p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-primary/10 text-primary">
                {type === "OFX" ? <FileText className="h-6 w-6" /> : <TableIcon className="h-6 w-6" />}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  Importar {type}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
                  {summary ? "Resumo do processamento" : "Selecione o arquivo e as configurações de destino."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar space-y-6 py-2">
        {!summary ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Conta de Destino</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/5 border-border/40 font-bold focus:ring-primary/20">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id} className="rounded-xl font-bold">{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Arquivo ({type === "OFX" ? ".ofx" : ".csv, .xls, .xlsx"})</Label>
              <div className="relative group">
                <Input 
                  type="file" 
                  accept={type === "OFX" ? ".ofx" : ".csv, .xls, .xlsx"}
                  className="h-12 rounded-2xl bg-muted/5 border-border/40 font-bold focus:ring-primary/20 file:bg-primary file:text-primary-foreground file:font-black file:uppercase file:text-[10px] file:tracking-widest file:rounded-xl file:border-0 file:mr-4 file:px-4 file:h-full cursor-pointer p-0"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {type === "SPREADSHEET" && (
              <div className="p-5 rounded-[24px] bg-muted/5 border border-border/40 space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Mapeamento de Colunas</h4>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 leading-tight pl-3.5">
                    Digite o nome da coluna **exatamente** como aparece no cabeçalho do seu arquivo.
                  </p>
                </div>

                {/* Seção: Obrigatórios */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 opacity-40">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Campos Obrigatórios</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground pl-1">Data do Lançamento *</Label>
                      <Input 
                        placeholder="Ex: Data, Vencimento" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs" 
                        value={mapping.date_column}
                        onChange={(e) => setMapping({...mapping, date_column: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground pl-1">Valor Financeiro *</Label>
                      <Input 
                        placeholder="Ex: Valor, Total, Quantia" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs"
                        value={mapping.amount_column}
                        onChange={(e) => setMapping({...mapping, amount_column: e.target.value})}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground pl-1">Descrição / Histórico *</Label>
                      <Input 
                        placeholder="Ex: Descrição, Nome da Transação, Detalhes" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs"
                        value={mapping.description_column}
                        onChange={(e) => setMapping({...mapping, description_column: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Opcionais */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 opacity-40">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Informações Adicionais</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Tipo (E/S)</Label>
                      <Input 
                        placeholder="Ex: Tipo, Natureza" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs"
                        value={mapping.type_column}
                        onChange={(e) => setMapping({...mapping, type_column: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Situação</Label>
                      <Input 
                        placeholder="Ex: Status, Situação" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs"
                        value={mapping.status_column}
                        onChange={(e) => setMapping({...mapping, status_column: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Categoria</Label>
                      <Input 
                        placeholder="Ex: Categoria" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs"
                        value={mapping.category_column}
                        onChange={(e) => setMapping({...mapping, category_column: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Subcategoria</Label>
                      <Input 
                        placeholder="Ex: Subcategoria" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs"
                        value={mapping.subcategory_column}
                        onChange={(e) => setMapping({...mapping, subcategory_column: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Tags (Etiquetas)</Label>
                      <Input 
                        placeholder="Ex: Tags, Marcadores" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs"
                        value={mapping.tags_column}
                        onChange={(e) => setMapping({...mapping, tags_column: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Conta Bancária</Label>
                      <Input 
                        placeholder="Ex: Conta, Origem" 
                        className="h-10 rounded-xl bg-background border-border/40 font-bold focus-visible:ring-primary/20 text-xs"
                        value={mapping.account_column}
                        onChange={(e) => setMapping({...mapping, account_column: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 items-start">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-primary/70 leading-relaxed font-medium">
                    Se você não mapear uma coluna de <strong>Conta</strong>, usaremos a <strong>{accounts.find(a => a.id === selectedAccountId)?.name || "selecionada acima"}</strong> para todos os registros.
                  </p>
                </div>
              </div>
            )}

            <Button 
                className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-14 shadow-xl shadow-primary/20 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] transition-all"
                onClick={handleImport}
                disabled={isLoading || !file || !selectedAccountId}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
              {isLoading ? "Processando..." : "Confirmar Importação"}
            </Button>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                   <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                   <p className="text-2xl font-black text-emerald-600 leading-none">{summary.imported}</p>
                   <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70">Importados</p>
                </div>
                <div className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
                   <AlertCircle className="h-5 w-5 text-blue-500 mx-auto" />
                   <p className="text-2xl font-black text-blue-600 leading-none">{summary.ignored}</p>
                   <p className="text-[9px] font-black uppercase tracking-widest text-blue-600/70">Ignorados</p>
                </div>
                <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-1">
                   <XCircle className="h-5 w-5 text-rose-500 mx-auto" />
                   <p className="text-2xl font-black text-rose-600 leading-none">{summary.errors}</p>
                   <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/70">Erros</p>
                </div>
                <div className="p-4 rounded-3xl bg-muted border border-border text-center space-y-1">
                   <div className="h-5 flex items-center justify-center font-black opacity-30">Σ</div>
                   <p className="text-2xl font-black text-foreground leading-none">{summary.total}</p>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Total</p>
                </div>
             </div>

             <Button 
               variant="outline" 
               className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-14 border-border/40 hover:bg-muted/50 transition-all"
               onClick={() => onOpenChange(false)}
             >
               Fechar e Atualizar
             </Button>
          </div>
        )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
