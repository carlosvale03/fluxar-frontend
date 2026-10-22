"use client"

import { useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { ARQUIVO_GRANDE_DEMAIS, FORMATO_NAO_SUPORTADO } from "@/components/transactions/import-dialog"
import { buttonVariants } from "@/components/ui/button"
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
    <div className="space-y-3">
      {/* AZ-30: soltar o arquivo ou escolher pelo botão; o campo fica dentro da
          área, então o foco do teclado nele acende o contorno da área toda */}
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
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center transition-colors duration-fast ease-az-out focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          arrastando ? "border-gold-line bg-elevated" : "border-border-input hover:bg-elevated",
          analisando && "pointer-events-none opacity-70",
        )}
      >
        {analisando ? (
          <Loader2 className="h-6 w-6 animate-spin text-fg-secondary" aria-hidden="true" />
        ) : (
          <Upload className="h-6 w-6 text-fg-secondary" aria-hidden="true" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {analisando ? "Analisando a planilha..." : "Solte o arquivo aqui ou clique para escolher"}
          </p>
          <p className="label text-muted-foreground">Arquivo (.csv, .xlsx) até 5 MB</p>
        </div>
        {!analisando && (
          <span aria-hidden="true" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Escolher arquivo
          </span>
        )}
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
      </label>
      <p className="text-center text-xs text-muted-foreground">
        As abas, as colunas e as contas são reconhecidas automaticamente. Você revisa tudo antes de importar.
      </p>
    </div>
  )
}
