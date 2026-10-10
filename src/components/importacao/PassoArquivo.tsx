"use client"

import { useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { ARQUIVO_GRANDE_DEMAIS, FORMATO_NAO_SUPORTADO } from "@/components/transactions/import-dialog"
import { cn } from "@/lib/utils"

const LIMITE_DE_BYTES = 5 * 1024 * 1024
const EXTENSOES = ["csv", "xlsx"]

// IMPORT-02 a IMPORT-04: a mesma conferência local do diálogo antigo; só
// evita o envio, e um 400 do backend vai por tratarErro
export function conferirArquivo(arquivo: File): string | null {
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? ""
  if (!EXTENSOES.includes(extensao)) return FORMATO_NAO_SUPORTADO
  if (arquivo.size > LIMITE_DE_BYTES) return ARQUIVO_GRANDE_DEMAIS
  return null
}

interface PassoArquivoProps {
  analisando: boolean
  onEscolher: (arquivo: File) => void
}

// IMPCOMP-43: arrastar e soltar ou escolher o arquivo; a análise começa na
// hora, sem botão de avançar
export function PassoArquivo({ analisando, onEscolher }: PassoArquivoProps) {
  const campo = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)

  const escolher = (arquivo: File | undefined | null) => {
    if (!arquivo) return
    const erro = conferirArquivo(arquivo)
    if (campo.current) campo.current.value = ""
    if (erro) {
      toast.error(erro)
      return
    }
    onEscolher(arquivo)
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
      <label
        htmlFor="arquivo-da-planilha"
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          if (!analisando) escolher(e.dataTransfer.files?.[0])
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-10 rounded-[28px] border-2 border-dashed text-center cursor-pointer transition-all",
          arrastando ? "border-primary bg-primary/5" : "border-border/60 bg-muted/5 hover:border-primary/40 hover:bg-muted/20",
          analisando && "pointer-events-none opacity-70",
        )}
      >
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
          {analisando ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-black uppercase tracking-tight">
            {analisando ? "Analisando a planilha..." : "Solte o arquivo aqui ou clique para escolher"}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Arquivo (.csv, .xlsx) até 5 MB
          </p>
        </div>
      </label>
      <input
        ref={campo}
        id="arquivo-da-planilha"
        aria-label="Arquivo da planilha"
        type="file"
        accept=".csv,.xlsx"
        className="sr-only"
        disabled={analisando}
        onChange={(e) => escolher(e.target.files?.[0])}
      />
      <p className="text-[10px] text-muted-foreground/70 font-medium text-center">
        As abas, as colunas e as contas são reconhecidas automaticamente. Você revisa tudo antes de importar.
      </p>
    </div>
  )
}
