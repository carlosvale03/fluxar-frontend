"use client"

import { Activity, Database, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { SaudeDoSistema } from "@/services/admin"

interface Props {
  saude: SaudeDoSistema | null | undefined
  carregando?: boolean
}

// O estado medido: verde só quando o backend respondeu "ok"; sem resposta, neutro
function corDoEstado(medido: boolean, ok: boolean) {
  if (!medido) return "text-muted-foreground"
  return ok ? "text-inflow" : "text-outflow"
}

// ADMIN-02: a saúde da API e do banco como o backend mediu agora. Sem
// resposta, a tela mostra "Sem dados", nunca um "Operacional" inventado.
export function CardsDeSaude({ saude, carregando = false }: Props) {
  const api = saude?.api
  const banco = saude?.database
  const apiOk = api === "ok"
  const bancoOk = banco?.status === "ok"

  return (
    <>
      <Card data-testid="saude-api">
        <CardHeader className="pb-2">
          <CardDescription className="label flex items-center justify-between text-muted-foreground">
            API
            <Activity className="h-4 w-4 text-info" aria-hidden="true" />
          </CardDescription>
          <CardTitle className={`value-l ${corDoEstado(!!api, apiOk)}`}>
            {carregando ? <><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /><span className="sr-only">Carregando</span></> : !api ? "Sem dados" : apiOk ? "Operacional" : "Com erro"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mt-1 text-xs text-muted-foreground">Estado medido agora</p>
        </CardContent>
      </Card>

      <Card data-testid="saude-banco">
        <CardHeader className="pb-2">
          <CardDescription className="label flex items-center justify-between text-muted-foreground">
            Banco de dados
            <Database className="h-4 w-4 text-info" aria-hidden="true" />
          </CardDescription>
          <CardTitle className={`value-l ${corDoEstado(!!banco, bancoOk)}`}>
            {carregando ? <><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /><span className="sr-only">Carregando</span></> : !banco ? "Sem dados" : bancoOk ? "Operacional" : "Com erro"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {banco && (
            <>
              <p className="font-mono text-xs text-muted-foreground">
                {banco.latency_ms === null ? "Sem latência" : `Latência: ${banco.latency_ms} ms`}
              </p>
              {banco.version && (
                <p className="font-mono text-xs text-muted-foreground">PostgreSQL {banco.version}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
