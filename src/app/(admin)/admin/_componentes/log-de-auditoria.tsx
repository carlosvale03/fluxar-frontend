import { ArrowRight } from "lucide-react"

import type { SystemLog, ValorDoLog } from "@/services/admin"

// AD-049: as ações do log de auditoria, com o nome mostrado na tela. As três
// últimas são de registros antigos, gravados antes do log estruturado.
export const ACOES_DO_LOG: { valor: string; rotulo: string }[] = [
  { valor: "CHANGE_PLAN", rotulo: "Mudança de plano" },
  { valor: "CHANGE_ROLE", rotulo: "Mudança de papel" },
  { valor: "CHANGE_STATUS", rotulo: "Mudança de status" },
  { valor: "RESET_PASSWORD", rotulo: "Redefinição de senha" },
  { valor: "CLEAR_DATA", rotulo: "Limpeza de dados" },
  { valor: "DELETE_ACCOUNT", rotulo: "Exclusão de conta" },
  { valor: "UPDATE_MAINTENANCE", rotulo: "Modo manutenção" },
  { valor: "UPDATE_TESTING_UNLOCK", rotulo: "Liberação para testes" },
  { valor: "UPDATE_PLAN_LOCK", rotulo: "Trava de plano" },
  { valor: "UPDATE_PLAN_LIMIT", rotulo: "Limite de plano" },
  { valor: "UPDATE_SETTING", rotulo: "Configuração" },
  { valor: "UPDATE_PROFILE", rotulo: "Perfil atualizado" },
  { valor: "ARCHIVE_ACCOUNT", rotulo: "Conta arquivada" },
  { valor: "EMAIL_VERIFIED", rotulo: "E-mail verificado" },
]

export function rotuloDaAcao(acao: string) {
  return ACOES_DO_LOG.find((a) => a.valor === acao)?.rotulo ?? acao
}

// Os mesmos nomes das outras telas do painel
const PLANOS: Record<string, string> = { COMMON: "Gratuito", PREMIUM: "Premium", PREMIUM_PLUS: "Premium Plus" }
const PAPEIS: Record<string, string> = { USER: "Usuário", ADMIN: "Administrador" }

// O valor de antes ou de depois como o administrador lê
export function formatarValorDoLog(acao: string, valor: ValorDoLog): string {
  if (valor === null || valor === undefined) return acao === "UPDATE_PLAN_LIMIT" ? "sem limite" : "—"
  if (typeof valor === "boolean") {
    switch (acao) {
      case "CHANGE_STATUS":
        return valor ? "Ativa" : "Arquivada"
      case "UPDATE_MAINTENANCE":
      case "UPDATE_TESTING_UNLOCK":
        return valor ? "Ligado" : "Desligado"
      case "UPDATE_PLAN_LOCK":
        return valor ? "Liberado" : "Bloqueado"
      default:
        return valor ? "Sim" : "Não"
    }
  }
  if (acao === "CHANGE_PLAN") return PLANOS[String(valor)] ?? String(valor)
  if (acao === "CHANGE_ROLE") return PAPEIS[String(valor)] ?? String(valor)
  return String(valor)
}

// ADMIN-08 e ADMIN-09: o antes e o depois, quando o registro tem
export function ValoresDoLog({ log }: { log: Pick<SystemLog, "action" | "before" | "after"> }) {
  const temValores = log.before !== null && log.before !== undefined
    || log.after !== null && log.after !== undefined
    || log.action === "UPDATE_PLAN_LIMIT"
  if (!temValores) return null

  return (
    <div data-testid="antes-e-depois" className="flex flex-wrap items-center gap-2 text-xs font-bold mt-1">
      <span className="text-muted-foreground">Antes:</span>
      <span className="px-2 py-0.5 rounded bg-muted/50 font-mono">{formatarValorDoLog(log.action, log.before)}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">Depois:</span>
      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">{formatarValorDoLog(log.action, log.after)}</span>
    </div>
  )
}
