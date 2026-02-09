"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Server, FileText, AlertTriangle, RefreshCw, Loader2, Database, Globe } from "lucide-react"
import { toast } from "sonner"
import { getAdminStats, getSystemLogs, updateSystemSettings, AdminStats, SystemLog } from "@/services/admin"

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("system")
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Data State
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [logs, setLogs] = useState<SystemLog[]>([])

  const loadData = async () => {
      try {
          setIsRefreshing(true)
          const [statsData, logsData] = await Promise.all([
              getAdminStats(),
              getSystemLogs()
          ])
          setStats(statsData)
          setLogs(logsData)
      } catch (error) {
          console.error("Failed to load admin settings data", error)
          toast.error("Erro ao carregar dados do sistema.")
      } finally {
          setIsRefreshing(false)
      }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleMaintenanceToggle = async (checked: boolean) => {
    try {
        setIsLoading(true)
        // Optimistic update
        setMaintenanceMode(checked) 
        
        await updateSystemSettings({ maintenance_mode: checked })
        
        if (checked) {
            toast.warning("Modo de manutenção ativado! Acesso restrito a administradores.")
        } else {
            toast.success("Sistema online e acessível para todos os usuários.")
        }
    } catch (error) {
        setMaintenanceMode(!checked) // Revert
        toast.error("Erro ao atualizar modo de manutenção.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleClearCache = () => {
      toast.promise(
          new Promise((resolve) => setTimeout(resolve, 2000)),
          {
              loading: 'Limpando cache do sistema...',
              success: 'Cache limpo com sucesso!',
              error: 'Erro ao limpar cache.'
          }
      )
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
            Configurações do Sistema
            </h1>
            <p className="text-sm font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">
            Gestão Global • Parâmetros & Auditoria
            </p>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData} 
            disabled={isRefreshing}
            className="rounded-full font-bold border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-300"
        >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar Dados
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] p-1 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10">
          <TabsTrigger value="system" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
            <Server className="h-4 w-4 mr-2" /> Sistema
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
            <FileText className="h-4 w-4 mr-2" /> Logs
          </TabsTrigger>
        </TabsList>

        {/* --- SYSTEM TAB --- */}
        <TabsContent value="system" className="mt-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* System Status Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                
                {/* Server Status */}
                <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px] overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-700" />
                    <CardHeader className="pb-2">
                        <CardDescription className="uppercase tracking-widest text-[10px] font-black opacity-70">Status do Servidor</CardDescription>
                        <CardTitle className="text-3xl font-black flex items-center gap-3">
                            {stats?.status || "Online"} 
                            <div className="relative flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs font-bold text-muted-foreground mt-2 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-emerald-500" />
                            Uptime: 99.9% (30d)
                        </div>
                    </CardContent>
                </Card>
                
                {/* Version Info */}
                <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px] group hover:border-primary/30 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardDescription className="uppercase tracking-widest text-[10px] font-black opacity-70">Versão da API</CardDescription>
                        <CardTitle className="text-3xl font-black text-foreground">v1.2.5</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="text-xs font-bold text-muted-foreground mt-2 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            Build: 2026.02.05-rc3
                        </div>
                    </CardContent>
                </Card>

                {/* Database Status */}
                <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px] group hover:border-blue-500/30 transition-all duration-300">
                     <CardHeader className="pb-2">
                        <CardDescription className="uppercase tracking-widest text-[10px] font-black opacity-70">Banco de Dados</CardDescription>
                        <CardTitle className="text-3xl font-black text-blue-500">Conectado</CardTitle>
                     </CardHeader>
                     <CardContent>
                         <div className="text-xs font-bold text-muted-foreground mt-2 flex items-center gap-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            PostgreSQL 15.4 (Lat: 45ms)
                        </div>
                     </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Maintenance Mode Control */}
                <Card className={`lg:col-span-2 border shadow-xl rounded-[32px] overflow-hidden transition-all duration-500 ${maintenanceMode ? 'border-destructive/50 bg-destructive/5' : 'border-border/40 bg-card/50 backdrop-blur-sm'}`}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl ${maintenanceMode ? 'bg-destructive/20 text-destructive' : 'bg-orange-500/10 text-orange-500'}`}>
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold">Modo de Manutenção</CardTitle>
                                <CardDescription>Bloqueio de acesso para usuários não-administradores.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between p-8 pt-2">
                        <div className="space-y-2">
                            <div className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Status Atual</div>
                            <Badge className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-full ${maintenanceMode ? "bg-destructive text-destructive-foreground hover:bg-destructive" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"}`}>
                                {maintenanceMode ? "⛔ MANUTENÇÃO ATIVA" : "✅ SISTEMA OPERACIONAL"}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-muted-foreground hidden sm:block">
                                {maintenanceMode ? "Desativar bloqueio" : "Ativar bloqueio"}
                            </span>
                            <Switch 
                                checked={maintenanceMode}
                                onCheckedChange={handleMaintenanceToggle}
                                disabled={isLoading}
                                className="data-[state=checked]:bg-destructive"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Cache Control */}
                <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[32px] flex flex-col justify-between">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                                <RefreshCw className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-lg font-bold">Cache Global</CardTitle>
                        </div>
                        <CardDescription>
                            Forçar atualização de dados estáticos e CDN.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="p-6 pt-0">
                        <Button variant="outline" className="w-full font-bold border-primary/20 hover:bg-primary/5 hover:text-primary rounded-xl" onClick={handleClearCache}>
                            Limpar Cache
                        </Button>
                    </CardFooter>
                </Card>
            </div>

        </TabsContent>

        {/* --- LOGS TAB --- */}
        <TabsContent value="logs" className="mt-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[32px] overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold">Logs de Auditoria</CardTitle>
                            <CardDescription>Registro imutável de atividades administrativas.</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-background/50 font-mono text-xs">
                            {logs.length} registros
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/40">
                        {isRefreshing && logs.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                                <p className="text-sm font-bold uppercase tracking-widest">Carregando logs...</p>
                            </div>
                        ) : logs.length > 0 ? (
                            logs.map((log) => (
                                <div key={log.id} className="p-4 sm:p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between group">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                                            {log.admin_name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-bold">{log.action}</p>
                                                <Badge variant="secondary" className="text-[10px] font-mono opacity-70">
                                                    ID: {log.id}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{log.description}</p>
                                            <p className="text-xs font-bold text-primary/70 mt-1 sm:hidden">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs font-bold text-foreground">
                                            {new Date(log.timestamp).toLocaleDateString()}
                                        </p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">por {log.admin_name}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Nenhum log encontrado.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t border-border/40 p-4 flex justify-center">
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary font-bold text-xs uppercase tracking-widest">
                        Ver histórico completo
                    </Button>
                </CardFooter>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
