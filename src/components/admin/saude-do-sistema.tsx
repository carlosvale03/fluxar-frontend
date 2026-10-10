"use client"

import { Activity, Database, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { SaudeDoSistema } from "@/services/admin"

interface Props {
  saude: SaudeDoSistema | null | undefined
  carregando?: boolean
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
      <Card
        data-testid="saude-api"
        className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px]"
      >
        <CardHeader className="pb-2">
          <CardDescription className="uppercase tracking-widest text-[10px] font-black opacity-70 flex items-center justify-between">
            API
            <Activity className="h-4 w-4 text-blue-500" />
          </CardDescription>
          <CardTitle className={`text-3xl font-black ${!api ? "text-muted-foreground" : apiOk ? "text-emerald-500" : "text-red-500"}`}>
            {carregando ? <Loader2 className="h-6 w-6 animate-spin" /> : !api ? "Sem dados" : apiOk ? "Operacional" : "Com erro"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">
            Estado medido agora
          </p>
        </CardContent>
      </Card>

      <Card
        data-testid="saude-banco"
        className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px]"
      >
        <CardHeader className="pb-2">
          <CardDescription className="uppercase tracking-widest text-[10px] font-black opacity-70 flex items-center justify-between">
            Banco de dados
            <Database className="h-4 w-4 text-blue-500" />
          </CardDescription>
          <CardTitle className={`text-3xl font-black ${!banco ? "text-muted-foreground" : bancoOk ? "text-emerald-500" : "text-red-500"}`}>
            {carregando ? <Loader2 className="h-6 w-6 animate-spin" /> : !banco ? "Sem dados" : bancoOk ? "Operacional" : "Com erro"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {banco && (
            <>
              <p className="text-xs font-bold text-muted-foreground">
                {banco.latency_ms === null ? "Sem latência" : `Latência: ${banco.latency_ms} ms`}
              </p>
              {banco.version && (
                <p className="text-xs font-bold text-muted-foreground">PostgreSQL {banco.version}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
