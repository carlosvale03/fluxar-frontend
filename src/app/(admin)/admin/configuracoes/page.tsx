"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Server, FileText, AlertTriangle, RefreshCw, Loader2, Globe, FlaskConical, Layers } from "lucide-react"
import { toast } from "sonner"
import { getAdminStats, getSystemLogs, updateSystemSettings, getSystemSettings, AdminStats, SystemLog, getAdminPlans, updateAdminPlans, ConfiguracaoDosPlanos, MudancaDosPlanos } from "@/services/admin"
import { TabelaDeTravas } from "@/components/planos/tabela-de-travas"
import { CardsDeSaude } from "@/components/admin/saude-do-sistema"
import { Paginacao } from "@/components/ui/paginacao"
import { tratarErro } from "@/lib/erros"

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("system")
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Data State
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [logs, setLogs] = useState<SystemLog[]>([])
  // CONTRATO-02 e CONTRATO-05: os logs vêm paginados
  const [logsPage, setLogsPage] = useState(1)
  const [logsCount, setLogsCount] = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  // PERM-10 e PERM-24: travas dos planos e liberação para testes
  const [planos, setPlanos] = useState<ConfiguracaoDosPlanos | null>(null)
  const [isSavingUnlock, setIsSavingUnlock] = useState(false)

  const loadPlans = async () => {
      try {
          setPlanos(await getAdminPlans())
      } catch (error) {
          tratarErro(error, { mensagemPadrao: "Erro ao carregar as travas dos planos.", tentarDeNovo: loadPlans })
      }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  // PERM-11: a resposta do PATCH já traz a configuração inteira
  const mudarPlanos = async (mudanca: MudancaDosPlanos) => {
      setPlanos(await updateAdminPlans(mudanca))
  }

  const handleTestingUnlockToggle = async (checked: boolean) => {
      try {
          setIsSavingUnlock(true)
          await mudarPlanos({ testing_unlock: checked })
          toast.success(checked
              ? "Liberação para testes ligada: todos os recursos estão liberados."
              : "Liberação para testes desligada: valem as travas configuradas.")
      } catch (error) {
          tratarErro(error, { mensagemPadrao: "Erro ao atualizar a liberação para testes." })
      } finally {
          setIsSavingUnlock(false)
      }
  }

  const loadLogs = async () => {
      try {
          setIsLoadingLogs(true)
          const data = await getSystemLogs(logsPage)
          setLogs(data.results)
          setLogsCount(data.count)
          setLogsTotalPages(data.total_pages)
      } catch (error) {
          tratarErro(error, { mensagemPadrao: "Erro ao carregar os logs.", tentarDeNovo: loadLogs })
      } finally {
          setIsLoadingLogs(false)
      }
  }

  useEffect(() => {
    loadLogs()
  }, [logsPage])

  const loadData = async () => {
      try {
          setIsRefreshing(true)
          const [statsData, settingsData] = await Promise.all([
              getAdminStats(),
              getSystemSettings()
          ])
          setStats(statsData)
          // Sem a configuração, a manutenção está desligada (SESSAO-24)
          setMaintenanceMode(settingsData?.maintenance_mode === 'true')
      } catch (error) {
          tratarErro(error, { mensagemPadrao: "Erro ao carregar dados do sistema.", tentarDeNovo: loadData })
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
        tratarErro(error, { mensagemPadrao: "Erro ao atualizar modo de manutenção." })
    } finally {
        setIsLoading(false)
    }
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
            onClick={() => { loadData(); loadLogs() }} 
            disabled={isRefreshing}
            className="rounded-full font-bold border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-300"
        >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar Dados
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] p-1 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10">
          <TabsTrigger value="system" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
            <Server className="h-4 w-4 mr-2" /> Sistema
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
            <FileText className="h-4 w-4 mr-2" /> Logs
          </TabsTrigger>
          <TabsTrigger value="plans" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
            <Layers className="h-4 w-4 mr-2" /> Planos e travas
          </TabsTrigger>
        </TabsList>

        {/* --- SYSTEM TAB --- */}
        <TabsContent value="system" className="mt-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* ADMIN-02 e ADMIN-03: saúde e versão medidas pelo backend */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <CardsDeSaude saude={stats?.health} carregando={isRefreshing && !stats} />

                <Card data-testid="versao-do-sistema" className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[24px] group hover:border-primary/30 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardDescription className="uppercase tracking-widest text-[10px] font-black opacity-70 flex items-center justify-between">
                            Versão do sistema
                            <Globe className="h-4 w-4 text-primary" />
                        </CardDescription>
                        <CardTitle className={`text-3xl font-black break-all ${stats?.version ? "text-foreground" : "text-muted-foreground"}`}>
                            {stats?.version || "Sem dados"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">
                            Deploy em execução
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Maintenance Mode Control */}
                <Card className={`border shadow-xl rounded-[32px] overflow-hidden transition-all duration-500 ${maintenanceMode ? 'border-destructive/50 bg-destructive/5' : 'border-border/40 bg-card/50 backdrop-blur-sm'}`}>
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

                {/* PERM-24: liberação para testes, junto da manutenção */}
                <Card className={`border shadow-xl rounded-[32px] overflow-hidden transition-all duration-500 ${planos?.testing_unlock ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/40 bg-card/50 backdrop-blur-sm'}`}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                                <FlaskConical className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold">Liberação para testes</CardTitle>
                                <CardDescription>Libera todos os recursos para todos os usuários, sem limites e sem mudar o plano de ninguém.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between p-8 pt-2">
                        <div className="space-y-2">
                            <div className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Status Atual</div>
                            <Badge className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-full ${planos?.testing_unlock ? "bg-amber-500 text-white hover:bg-amber-500" : "bg-muted text-muted-foreground hover:bg-muted"}`}>
                                {planos?.testing_unlock ? "Tudo liberado" : "Valem as travas dos planos"}
                            </Badge>
                        </div>
                        <Switch
                            aria-label="Liberação para testes"
                            checked={planos?.testing_unlock ?? false}
                            onCheckedChange={handleTestingUnlockToggle}
                            disabled={!planos || isSavingUnlock}
                            className="data-[state=checked]:bg-amber-500"
                        />
                    </CardContent>
                </Card>
            </div>

        </TabsContent>

        {/* --- PLANOS E TRAVAS (PERM-10 a PERM-13) --- */}
        <TabsContent value="plans" className="mt-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl rounded-[32px] overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-xl font-bold">Planos e travas</CardTitle>
                    <CardDescription>
                        O que cada plano libera. As mudanças valem para os usuários do plano em até 30 segundos
                        {planos?.testing_unlock ? ", depois que a liberação para testes for desligada" : ""}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {planos ? (
                        <TabelaDeTravas catalogo={planos.catalog} aoMudar={mudarPlanos} />
                    ) : (
                        <div className="p-12 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </CardContent>
            </Card>
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
                            {logsCount} registros
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/40">
                        {isLoadingLogs && logs.length === 0 ? (
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
                <CardFooter className="p-0">
                    <Paginacao
                        pagina={logsPage}
                        totalDePaginas={logsTotalPages}
                        total={logsCount}
                        rotulo="registros"
                        carregando={isLoadingLogs}
                        onMudarPagina={setLogsPage}
                    />
                </CardFooter>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
