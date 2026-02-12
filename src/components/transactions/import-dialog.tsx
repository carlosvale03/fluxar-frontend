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
  Table as TableIcon
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
      <DialogContent className="sm:max-w-[500px] rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-tight flex items-center gap-2">
            {type === "OFX" ? <FileText className="h-5 w-5" /> : <TableIcon className="h-5 w-5" />}
            Importar {type}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            {summary ? "Resumo do processamento" : "Selecione o arquivo e as configurações de destino."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar space-y-6 py-2">
        {!summary ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Conta de Destino</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="rounded-2xl border-border/40 bg-muted/20">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Arquivo ({type === "OFX" ? ".ofx" : ".csv, .xls, .xlsx"})</Label>
              <div className="relative group">
                <Input 
                  type="file" 
                  accept={type === "OFX" ? ".ofx" : ".csv, .xls, .xlsx"}
                  className="rounded-2xl border-border/40 bg-muted/20 file:bg-primary file:text-primary-foreground file:font-black file:uppercase file:text-[10px] file:tracking-widest file:rounded-lg file:border-0 file:mr-4 file:px-4 cursor-pointer"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {type === "SPREADSHEET" && (
              <div className="p-4 rounded-[24px] bg-muted/30 border border-border/40 space-y-4 animate-in fade-in zoom-in duration-300">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50">Mapeamento de Colunas (Nome exato)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase">Data *</Label>
                    <Input 
                      placeholder="Ex: Data" 
                      className="h-8 rounded-xl text-xs" 
                      value={mapping.date_column}
                      onChange={(e) => setMapping({...mapping, date_column: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase">Valor * (inclui +/-)</Label>
                    <Input 
                      placeholder="Ex: Valor" 
                      className="h-8 rounded-xl text-xs"
                      value={mapping.amount_column}
                      onChange={(e) => setMapping({...mapping, amount_column: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[9px] font-bold uppercase">Descrição *</Label>
                    <Input 
                      placeholder="Ex: Descrição / Histórico" 
                      className="h-8 rounded-xl text-xs"
                      value={mapping.description_column}
                      onChange={(e) => setMapping({...mapping, description_column: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Tipo</Label>
                    <Input 
                      placeholder="Receita/Despesa" 
                      className="h-8 rounded-xl text-xs opacity-80"
                      value={mapping.type_column}
                      onChange={(e) => setMapping({...mapping, type_column: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Situação</Label>
                    <Input 
                      placeholder="Pendente/Liquidado" 
                      className="h-8 rounded-xl text-xs opacity-80"
                      value={mapping.status_column}
                      onChange={(e) => setMapping({...mapping, status_column: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Categoria</Label>
                    <Input 
                      placeholder="Ex: Categoria" 
                      className="h-8 rounded-xl text-xs opacity-80"
                      value={mapping.category_column}
                      onChange={(e) => setMapping({...mapping, category_column: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Subcategoria</Label>
                    <Input 
                      placeholder="Ex: Subcategoria" 
                      className="h-8 rounded-xl text-xs opacity-80"
                      value={mapping.subcategory_column}
                      onChange={(e) => setMapping({...mapping, subcategory_column: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Tags</Label>
                    <Input 
                      placeholder="Tags separadas por vírgula" 
                      className="h-8 rounded-xl text-xs opacity-80"
                      value={mapping.tags_column}
                      onChange={(e) => setMapping({...mapping, tags_column: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase opacity-60">Conta</Label>
                    <Input 
                      placeholder="Ex: Banco / Carteira" 
                      className="h-8 rounded-xl text-xs opacity-80"
                      value={mapping.account_column}
                      onChange={(e) => setMapping({...mapping, account_column: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button 
                className="w-full rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 shadow-lg shadow-primary/20"
                onClick={handleImport}
                disabled={isLoading || !file || !selectedAccountId}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
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
               className="w-full rounded-2xl font-black uppercase tracking-widest text-[10px] h-12"
               onClick={() => onOpenChange(false)}
             >
               Fechar e Atualizar
             </Button>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
