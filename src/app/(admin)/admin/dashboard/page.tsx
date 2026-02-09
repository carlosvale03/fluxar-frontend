"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, CreditCard, ShieldCheck, Activity, Loader2 } from "lucide-react"
import { getAdminStats, AdminStats } from "@/services/admin"
import { toast } from "sonner"
import Link from "next/link"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoading(true)
        const data = await getAdminStats()
        setStats(data)
      } catch (error) {
        toast.error("Erro ao carregar métricas.")
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
          Painel Administrativo
        </h1>
        <p className="text-sm font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">
          Gestão Global • Visão Geral do Sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.total_users || 0}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">
              {isLoading ? "CARREGANDO DADOS..." : "BASE TOTAL CADASTRADA"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">
              Usuários Premium
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.premium_users || 0}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">
              {isLoading ? "CALCULANDO..." : "ASSINATURAS ATIVAS"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">
              Status do Sistema
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${stats?.status === 'Operacional' ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Operacional"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">API HEALTH CHECK OK</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[32px] p-8 flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Gestão de Usuários</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                      Acesse agora para visualizar, filtrar e gerenciar todos os usuários da base em tempo real.
                  </p>
                  <Button asChild variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px] mt-4 border-primary/20 hover:bg-primary/10">
                    <Link href="/admin/usuarios">Gerenciar Base</Link>
                  </Button>
              </div>
          </Card>

          <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[32px] p-8 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">Cadastros Recentes</h3>
              <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
                    </div>
                  ) : stats?.recent_users?.length ? (
                    stats.recent_users.map((u) => (
                      <div key={u.id} className="flex gap-4 items-start pb-4 border-b border-border/40 last:border-0 last:pb-0 group">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 group-hover:scale-150 transition-transform" />
                          <div>
                              <p className="text-xs font-bold leading-none">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-1 font-black opacity-50 uppercase tracking-widest">
                                  {u.email} • {new Date(u.created_at).toLocaleDateString('pt-BR')}
                              </p>
                          </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground/50 text-center py-10">Nenhum registro recente.</p>
                  )}
              </div>
          </Card>
      </div>
    </div>
  )
}
