"use client"

import Link from "next/link"
import { AlertCircle, CheckCircle2, Landmark, XCircle } from "lucide-react"

import { textoDasSugeridas } from "@/components/transactions/import-dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RejeitadaDaImportacao, ResultadoDaImportacao as Resultado } from "@/types/importacao"

// IMPCOMP-49: "<aba>, linha <n>: <motivo>"
export function textoDaRejeitada({ sheet, line, reason }: RejeitadaDaImportacao): string {
  return sheet ? `${sheet}, linha ${line}: ${reason}` : `Linha ${line}: ${reason}`
}

interface ResultadoDaImportacaoProps {
  resultado: Resultado
  onFechar: () => void
}

// IMPCOMP-49: os quatro totais, as contas criadas, os totais por aba e as
// rejeitadas com a aba, o número e o motivo
export function ResultadoDaImportacao({ resultado, onFechar }: ResultadoDaImportacaoProps) {
  const abas = Object.entries(resultado.by_sheet ?? {})
  const contasCriadas = resultado.accounts_created ?? []

  // A cor acompanha o ícone e o rótulo em texto (DESIGN.md §2, princípio 3)
  const totais = [
    { rotulo: "Lidas", valor: resultado.total, cor: "text-foreground", icone: <span aria-hidden="true" className="font-mono text-sm text-muted-foreground">Σ</span> },
    { rotulo: "Gravadas", valor: resultado.imported, cor: "text-inflow", icone: <CheckCircle2 className="h-4 w-4 text-inflow" aria-hidden="true" /> },
    { rotulo: "Ignoradas", valor: resultado.ignored, cor: "text-info", icone: <AlertCircle className="h-4 w-4 text-info" aria-hidden="true" /> },
    { rotulo: "Rejeitadas", valor: resultado.rejected, cor: "text-outflow", icone: <XCircle className="h-4 w-4 text-outflow" aria-hidden="true" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {totais.map(({ rotulo, valor, cor, icone }) => (
          <div key={rotulo} className="space-y-1 rounded-md border border-border bg-card p-4">
            <div className="flex h-5 items-center">{icone}</div>
            <p className={`value-l ${cor}`}>{valor}</p>
            <p className="label text-muted-foreground">{rotulo}</p>
          </div>
        ))}
      </div>

      {(resultado.excluded > 0 || resultado.summary_rows > 0) && (
        <p className="text-center text-xs text-muted-foreground">
          {resultado.excluded > 0 && `${resultado.excluded} excluída${resultado.excluded === 1 ? "" : "s"} na revisão`}
          {resultado.excluded > 0 && resultado.summary_rows > 0 && " · "}
          {resultado.summary_rows > 0 &&
            `${resultado.summary_rows} linha${resultado.summary_rows === 1 ? "" : "s"} de total pulada${resultado.summary_rows === 1 ? "" : "s"}`}
        </p>
      )}

      {/* IMPORT-45: as sugeridas, com o atalho para a lista filtrada */}
      {resultado.suggested > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-r-lg border border-l-[3px] border-border border-l-info bg-card p-4">
          <p className="text-sm text-foreground">{textoDasSugeridas(resultado.suggested)}</p>
          <Link
            href={`/transacoes?import_batch=${encodeURIComponent(resultado.batch_id)}&suggested_category=true`}
            onClick={onFechar}
            className="shrink-0 text-sm font-semibold text-gold-line underline-offset-4 hover:underline"
          >
            Revisar sugeridas
          </Link>
        </div>
      )}

      {contasCriadas.length > 0 && (
        <section aria-label="Contas criadas" className="space-y-2">
          <h3 className="label text-muted-foreground">Contas criadas</h3>
          <ul className="flex flex-wrap gap-2">
            {contasCriadas.map((conta) => (
              <li key={conta.id} className="flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-sm">
                <Landmark className="h-3.5 w-3.5 text-fg-secondary" aria-hidden="true" /> {conta.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {abas.length > 0 && (
        <section aria-label="Totais por aba" className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Aba", "Gravadas", "Ignoradas", "Rejeitadas"].map((titulo, i) => (
                  <TableHead key={titulo} className={i > 0 ? "text-right" : undefined}>
                    {titulo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {abas.map(([aba, totais]) => (
                <TableRow key={aba}>
                  <TableCell className="font-medium">{aba}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-inflow">{totais.imported}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-info">{totais.ignored}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-outflow">{totais.rejected}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {resultado.rejected_rows.length > 0 && (
        <section aria-label="Linhas rejeitadas" className="space-y-2 rounded-r-lg border border-l-[3px] border-border border-l-outflow bg-card p-4">
          <h3 className="label text-outflow">Linhas rejeitadas</h3>
          <div className="custom-scrollbar max-h-[180px] overflow-y-auto pr-2">
            <ul className="space-y-1">
              {resultado.rejected_rows.map((rejeitada) => (
                <li
                  key={`${rejeitada.sheet}:${rejeitada.line}`}
                  className="text-xs text-fg-secondary"
                >
                  {textoDaRejeitada(rejeitada)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="flex justify-end border-t border-border pt-4">
        <Button className="w-full sm:w-auto" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </div>
  )
}
