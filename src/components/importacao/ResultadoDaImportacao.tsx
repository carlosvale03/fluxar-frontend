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

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-muted border border-border text-center space-y-1">
          <div className="h-5 flex items-center justify-center font-black opacity-30">Σ</div>
          <p className="text-2xl font-black text-foreground leading-none">{resultado.total}</p>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Lidas</p>
        </div>
        <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
          <p className="text-2xl font-black text-emerald-600 leading-none">{resultado.imported}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70">Gravadas</p>
        </div>
        <div className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
          <AlertCircle className="h-5 w-5 text-blue-500 mx-auto" />
          <p className="text-2xl font-black text-blue-600 leading-none">{resultado.ignored}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-600/70">Ignoradas</p>
        </div>
        <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-1">
          <XCircle className="h-5 w-5 text-rose-500 mx-auto" />
          <p className="text-2xl font-black text-rose-600 leading-none">{resultado.rejected}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/70">Rejeitadas</p>
        </div>
      </div>

      {(resultado.excluded > 0 || resultado.summary_rows > 0) && (
        <p className="text-[10px] font-medium text-muted-foreground text-center">
          {resultado.excluded > 0 && `${resultado.excluded} excluída${resultado.excluded === 1 ? "" : "s"} na revisão`}
          {resultado.excluded > 0 && resultado.summary_rows > 0 && " · "}
          {resultado.summary_rows > 0 &&
            `${resultado.summary_rows} linha${resultado.summary_rows === 1 ? "" : "s"} de total pulada${resultado.summary_rows === 1 ? "" : "s"}`}
        </p>
      )}

      {/* IMPORT-45: as sugeridas, com o atalho para a lista filtrada */}
      {resultado.suggested > 0 && (
        <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-primary">{textoDasSugeridas(resultado.suggested)}</p>
          <Link
            href={`/transacoes?import_batch=${encodeURIComponent(resultado.batch_id)}&suggested_category=true`}
            onClick={onFechar}
            className="text-[10px] font-black uppercase tracking-widest text-primary underline-offset-4 hover:underline shrink-0"
          >
            Revisar sugeridas
          </Link>
        </div>
      )}

      {contasCriadas.length > 0 && (
        <section aria-label="Contas criadas" className="p-4 rounded-3xl bg-primary/5 border border-primary/10 space-y-2">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Contas criadas</h5>
          <ul className="flex flex-wrap gap-2">
            {contasCriadas.map((conta) => (
              <li key={conta.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border border-border/60 text-xs font-bold">
                <Landmark className="h-3.5 w-3.5 text-primary" /> {conta.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {abas.length > 0 && (
        <section aria-label="Totais por aba" className="rounded-3xl border border-border/40 overflow-hidden">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {["Aba", "Gravadas", "Ignoradas", "Rejeitadas"].map((titulo) => (
                  <TableHead key={titulo} className="h-9 text-[9px] font-black uppercase tracking-widest">
                    {titulo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {abas.map(([aba, totais]) => (
                <TableRow key={aba}>
                  <TableCell className="font-bold">{aba}</TableCell>
                  <TableCell className="tabular-nums text-emerald-600 font-bold">{totais.imported}</TableCell>
                  <TableCell className="tabular-nums text-blue-600 font-bold">{totais.ignored}</TableCell>
                  <TableCell className="tabular-nums text-rose-600 font-bold">{totais.rejected}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {resultado.rejected_rows.length > 0 && (
        <section aria-label="Linhas rejeitadas" className="p-4 rounded-3xl bg-rose-500/5 border border-rose-500/10 space-y-2">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-rose-600 px-1">Linhas rejeitadas</h5>
          <div className="max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
            <ul className="space-y-1">
              {resultado.rejected_rows.map((rejeitada) => (
                <li
                  key={`${rejeitada.sheet}:${rejeitada.line}`}
                  className="text-[10px] font-medium text-rose-500/80 leading-tight"
                >
                  {textoDaRejeitada(rejeitada)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Button className="w-full rounded-full font-black uppercase tracking-widest text-[10px] h-14 bg-primary" onClick={onFechar}>
        Fechar
      </Button>
    </div>
  )
}
