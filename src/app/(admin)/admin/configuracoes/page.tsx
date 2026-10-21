"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Server, FileText, AlertTriangle, RefreshCw, Loader2, Globe, FlaskConical, Layers, OctagonX, CircleCheck } from "lucide-react"
import { toast } from "sonner"
import { getAdminStats, getSystemLogs, getAdministradores, updateSystemSettings, getSystemSettings, AdminStats, SystemLog, FiltrosDoLog, getAdminPlans, updateAdminPlans, ConfiguracaoDosPlanos, MudancaDosPlanos } from "@/services/admin"
import type { User } from "@/contexts/auth-context"
import { TabelaDeTravas } from "@/components/planos/tabela-de-travas"
import { CardsDeSaude } from "@/components/admin/saude-do-sistema"
import { ACOES_DO_LOG, ValoresDoLog, rotuloDaAcao } from "@/app/(admin)/admin/_componentes/log-de-auditoria"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  // ADMIN-13: filtros por ação, administrador e período
  const [filtrosDoLog, setFiltrosDoLog] = useState<FiltrosDoLog>({})
  const [administradores, setAdministradores] = useState<User[]>([])
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
          const data = await getSystemLogs(logsPage, filtrosDoLog)
          setLogs(data.results)
          setLogsCount(data.count)
          setLogsTotalPages(data.total_pages)
      } catch (error) {
          // Data inválida no filtro: 400 do campo, que vira aviso
          tratarErro(error, { mensagemPadrao: "Erro ao carregar os logs.", tentarDeNovo: loadLogs })
      } finally {
          setIsLoadingLogs(false)
      }
  }

  useEffect(() => {
    loadLogs()
  }, [logsPage, filtrosDoLog])

  // ADMIN-13: mudar um filtro volta à primeira página
  const mudarFiltro = (campo: keyof FiltrosDoLog, valor: string) => {
      setFiltrosDoLog((atuais) => ({ ...atuais, [campo]: valor }))
      setLogsPage(1)
  }

  const loadAdmins = async () => {
      try {
          setAdministradores(await getAdministradores())
      } catch (error) {
          tratarErro(error, { mensagemPadrao: "Erro ao carregar os administradores.", tentarDeNovo: loadAdmins })
      }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

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
            toast.warning("Modo de manutenção ativado. Acesso restrito a administradores.")
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
    <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h1 className="display-l">
            Configurações do Sistema
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
            Gestão global · parâmetros e auditoria
            </p>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { loadData(); loadLogs() }} 
            disabled={isRefreshing}
        >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Atualizar Dados
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="system">
            <Server className="mr-2 h-4 w-4" aria-hidden="true" /> Sistema
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" /> Logs
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Layers className="mr-2 h-4 w-4" aria-hidden="true" /> Planos e travas
          </TabsTrigger>
        </TabsList>

        {/* --- SYSTEM TAB --- */}
        <TabsContent value="system" className="mt-8 space-y-8">
            
            {/* ADMIN-02 e ADMIN-03: saúde e versão medidas pelo backend */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <CardsDeSaude saude={stats?.health} carregando={isRefreshing && !stats} />

                <Card data-testid="versao-do-sistema">
                    <CardHeader className="pb-2">
                        <CardDescription className="label flex items-center justify-between text-muted-foreground">
                            Versão do sistema
                            <Globe className="h-4 w-4 text-info" aria-hidden="true" />
                        </CardDescription>
                        <CardTitle className={`value-l break-all ${stats?.version ? "text-foreground" : "text-muted-foreground"}`}>
                            {stats?.version || "Sem dados"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Deploy em execução
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Modo de manutenção: a listra lateral mostra o estado, sem pintar o card */}
                <Card className={`overflow-hidden border-l-[3px] transition-colors duration-base ease-az-out ${maintenanceMode ? 'border-l-outflow' : 'border-l-border-strong'}`}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className={`rounded-md border border-border-strong bg-elevated p-3 ${maintenanceMode ? 'text-outflow' : 'text-warn'}`}>
                                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div>
                                <CardTitle className="display-m">Modo de Manutenção</CardTitle>
                                <CardDescription>Bloqueio de acesso para usuários não-administradores.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between p-8 pt-2">
                        <div className="space-y-2">
                            <div className="label text-muted-foreground">Status atual</div>
                            {maintenanceMode ? (
                                <Badge variant="destructive">
                                    <OctagonX className="h-3.5 w-3.5" aria-hidden="true" />
                                    Manutenção ativa
                                </Badge>
                            ) : (
                                <Badge variant="success">
                                    <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                    Sistema operacional
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="hidden text-xs text-muted-foreground sm:block">
                                {maintenanceMode ? "Desativar bloqueio" : "Ativar bloqueio"}
                            </span>
                            <Switch
                                checked={maintenanceMode}
                                onCheckedChange={handleMaintenanceToggle}
                                disabled={isLoading}
                                className="data-[state=checked]:bg-outflow"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* PERM-24: liberação para testes, junto da manutenção */}
                <Card className={`overflow-hidden border-l-[3px] transition-colors duration-base ease-az-out ${planos?.testing_unlock ? 'border-l-warn' : 'border-l-border-strong'}`}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="rounded-md border border-border-strong bg-elevated p-3 text-warn">
                                <FlaskConical className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div>
                                <CardTitle className="display-m">Liberação para testes</CardTitle>
                                <CardDescription>Libera todos os recursos para todos os usuários, sem limites e sem mudar o plano de ninguém.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between p-8 pt-2">
                        <div className="space-y-2">
                            <div className="label text-muted-foreground">Status atual</div>
                            <Badge variant={planos?.testing_unlock ? "warning" : "secondary"}>
                                {planos?.testing_unlock ? "Tudo liberado" : "Valem as travas dos planos"}
                            </Badge>
                        </div>
                        <Switch
                            aria-label="Liberação para testes"
                            checked={planos?.testing_unlock ?? false}
                            onCheckedChange={handleTestingUnlockToggle}
                            disabled={!planos || isSavingUnlock}
                            className="data-[state=checked]:bg-warn"
                        />
                    </CardContent>
                </Card>
            </div>

        </TabsContent>

        {/* --- PLANOS E TRAVAS (PERM-10 a PERM-13) --- */}
        <TabsContent value="plans" className="mt-8">
            <Card className="overflow-hidden">
                <CardHeader className="border-b border-border">
                    <CardTitle className="display-m">Planos e travas</CardTitle>
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
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- LOGS TAB (ADMIN-12 e ADMIN-13) --- */}
        <TabsContent value="logs" className="mt-8">
            <Card className="overflow-hidden">
                <CardHeader className="border-b border-border space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="display-m">Logs de Auditoria</CardTitle>
                            <CardDescription>Registro imutável de atividades administrativas.</CardDescription>
                        </div>
                        <Badge variant="secondary">
                            {logsCount} registros
                        </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                            <Label className="label text-muted-foreground">Ação</Label>
                            <Select value={filtrosDoLog.action || "ALL"} onValueChange={(valor) => mudarFiltro("action", valor === "ALL" ? "" : valor)}>
                                <SelectTrigger aria-label="Filtrar por ação">
                                    <SelectValue placeholder="Todas as ações" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas as ações</SelectItem>
                                    {ACOES_DO_LOG.map((acao) => (
                                        <SelectItem key={acao.valor} value={acao.valor}>{acao.rotulo}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="label text-muted-foreground">Administrador</Label>
                            <Select value={filtrosDoLog.admin || "ALL"} onValueChange={(valor) => mudarFiltro("admin", valor === "ALL" ? "" : valor)}>
                                <SelectTrigger aria-label="Filtrar por administrador">
                                    <SelectValue placeholder="Todos os administradores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os administradores</SelectItem>
                                    {administradores.map((admin) => (
                                        <SelectItem key={admin.id} value={admin.id}>{admin.name} ({admin.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="log-inicio" className="label text-muted-foreground">De</Label>
                            <Input
                                id="log-inicio"
                                type="date"
                               
                                value={filtrosDoLog.inicio ?? ""}
                                max={filtrosDoLog.fim || undefined}
                                onChange={(e) => mudarFiltro("inicio", e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="log-fim" className="label text-muted-foreground">Até</Label>
                            <Input
                                id="log-fim"
                                type="date"
                               
                                value={filtrosDoLog.fim ?? ""}
                                min={filtrosDoLog.inicio || undefined}
                                onChange={(e) => mudarFiltro("fim", e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {isLoadingLogs && logs.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
                                <Loader2 className="mb-4 h-8 w-8 animate-spin" />
                                <p className="label">Carregando logs</p>
                            </div>
                        ) : logs.length > 0 ? (
                            logs.map((log) => (
                                <div key={log.id} className="flex flex-col justify-between gap-4 p-4 transition-colors duration-fast ease-az-out hover:bg-elevated sm:flex-row sm:items-center sm:p-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-elevated font-mono uppercase" aria-hidden="true">
                                            {log.admin_email.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold">{rotuloDaAcao(log.action)}</p>
                                                <Badge variant="secondary">
                                                    {log.action}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{log.description}</p>
                                            {log.user_email && (
                                                <p className="text-xs text-muted-foreground mt-1">Usuário: {log.user_email}</p>
                                            )}
                                            <ValoresDoLog log={log} />
                                            <p className="mt-1 font-mono text-xs text-muted-foreground sm:hidden">
                                                {new Date(log.timestamp).toLocaleString('pt-BR')} · por {log.admin_email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block shrink-0">
                                        <p className="font-mono text-xs text-foreground">
                                            {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                                        </p>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">por {log.admin_email}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">
                                <FileText className="mx-auto mb-4 h-12 w-12" aria-hidden="true" />
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
