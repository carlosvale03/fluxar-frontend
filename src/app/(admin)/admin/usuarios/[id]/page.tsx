"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    ShieldCheck, Activity, Loader2,
    ArrowLeft, Mail, Phone, Calendar, MapPin,
    Wallet, Clock, AlertCircle, CheckCircle2,
    AlertTriangle, Trash2, ShieldAlert, Archive, Eraser
} from "lucide-react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { 
    getAdminUser, 
    getUserFinancialStats, 
    getUserLogs, 
    UserFinancialStats, 
    SystemLog, 
    updateAdminUser,
    hardDeleteAdminUser,
    deleteAdminUser,
    resetAdminUserPassword,
    clearAdminUserData,
    type UsuarioNoPainel,
} from "@/services/admin"
import { toast } from "sonner"
import { getAbsoluteUrl } from "@/lib/utils"
import { Paginacao } from "@/components/ui/paginacao"
import { tratarErro } from "@/lib/erros"
import { formatarMoeda } from "@/lib/dinheiro"
import { ValoresDoLog, rotuloDaAcao } from "@/app/(admin)/admin/_componentes/log-de-auditoria"
import {
    APAGADO_NA_EXCLUSAO,
    APAGADO_NA_LIMPEZA,
    CampoDaSenhaDoAdmin,
    CampoDoEmailDeConfirmacao,
    MANTIDO_NA_LIMPEZA,
    emailConfere,
    tratarErroDaAcao,
} from "@/app/(admin)/admin/_componentes/confirmacoes"
import type { Plano } from "@/types/planos"

const NOMES_DOS_PLANOS: Record<string, string> = {
  COMMON: "Gratuito",
  PREMIUM: "Premium",
  PREMIUM_PLUS: "Premium Plus",
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [erroAoCarregar, setErroAoCarregar] = useState(false)
  // LGPD-19: CPF e telefone mascarados como vêm da API, sem nascimento nem renda
  const [user, setUser] = useState<UsuarioNoPainel | null>(null)
  const [financialStats, setFinancialStats] = useState<UserFinancialStats | null>(null)
  const [logs, setLogs] = useState<SystemLog[]>([])
  // CONTRATO-02 e CONTRATO-05: os logs do usuário vêm paginados
  const [logsPage, setLogsPage] = useState(1)
  const [logsCount, setLogsCount] = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)

  // Modal Alterar Plano
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false)
  const [newPlan, setNewPlan] = useState<string>("COMMON")
  const [adminPassword, setAdminPassword] = useState("")
  // ADMIN-18: a recusa da senha aparece no campo
  const [erroSenha, setErroSenha] = useState("")
  // ADMIN-20: limpar e excluir pedem o e-mail do usuário digitado
  const [emailDigitado, setEmailDigitado] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modais de Exclusão/Arquivamento
  const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false)

  // Modal Reset Senha
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  // Cada confirmação começa com os campos vazios
  const abrir = (abrirDialogo: (aberto: boolean) => void) => {
    setAdminPassword("")
    setErroSenha("")
    setEmailDigitado("")
    setNewPassword("")
    abrirDialogo(true)
  }

  const loadLogs = async () => {
    if (!userId) return
    try {
        const logsData = await getUserLogs(userId, logsPage)
        setLogs(logsData.results)
        setLogsCount(logsData.count)
        setLogsTotalPages(logsData.total_pages)
    } catch (error) {
        tratarErro(error, { mensagemPadrao: "Erro ao carregar os logs.", tentarDeNovo: loadLogs })
    }
  }

  useEffect(() => {
    loadLogs()
  }, [userId, logsPage])

  // ADMIN-01: a falha fica na tela, com "Tentar de novo", sem dado de exemplo
  // e sem levar de volta à lista
  const loadData = async () => {
    if (!userId) return

    try {
        setIsLoading(true)
        setErroAoCarregar(false)
        const [userData, statsData] = await Promise.all([
            getAdminUser(userId),
            getUserFinancialStats(userId)
        ])
        setUser(userData)
        setFinancialStats(statsData)
        setNewPlan(userData.plan)
    } catch (error) {
        setUser(null)
        setFinancialStats(null)
        setErroAoCarregar(true)
        tratarErro(error, { mensagemPadrao: "Erro ao carregar detalhes do usuário.", tentarDeNovo: loadData })
    } finally {
        setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userId])

  // As ações sobre o usuário; sem os dados dele, ficam todas desabilitadas
  const botoesDeAcao = (habilitados: boolean) => (
      <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="font-bold border-primary/20 hover:bg-primary/10"
            onClick={() => abrir(setIsResetModalOpen)}
            disabled={!habilitados}
          >
              Resetar Senha
          </Button>
          <Button
            variant="outline"
            className="font-bold border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
            onClick={() => abrir(setIsClearDataModalOpen)}
            disabled={!habilitados}
          >
              <Eraser className="mr-2 h-4 w-4" /> Limpar Dados
          </Button>
          <Button
            variant="secondary"
            className="font-bold bg-muted/50 hover:bg-muted text-foreground"
            onClick={() => abrir(setIsArchiveModalOpen)}
            disabled={!habilitados}
          >
              <Archive className="mr-2 h-4 w-4" /> Arquivar Conta
          </Button>
          <Button
            variant="destructive"
            className="font-bold shadow-lg shadow-red-500/20"
            onClick={() => abrir(setIsHardDeleteModalOpen)}
            disabled={!habilitados}
          >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir Permanente
          </Button>
      </div>
  )

  const voltar = (
      <Button
        variant="ghost"
        className="w-fit pl-0 hover:bg-transparent hover:text-primary transition-colors duration-200"
        onClick={() => router.back()}
      >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
      </Button>
  )

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Carregando Perfil...</p>
          </div>
      )
  }

  if (!user) {
      return (
          <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl animate-in fade-in duration-500">
              <div className="flex flex-col gap-6">
                  {voltar}
                  {botoesDeAcao(false)}
              </div>
              <Card role="alert" className="border border-red-500/20 bg-red-500/5 shadow-sm rounded-[24px]">
                  <CardContent className="flex flex-col items-center text-center gap-4 p-10">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                          <AlertCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="space-y-1">
                          <h2 className="text-lg font-black uppercase tracking-tight">Não foi possível carregar o usuário</h2>
                          <p className="text-sm text-muted-foreground font-medium">
                              {erroAoCarregar
                                ? "Os dados não chegaram da API. Nenhuma ação fica disponível até eles carregarem."
                                : "Usuário não informado."}
                          </p>
                      </div>
                      <Button onClick={loadData} className="rounded-xl font-black uppercase tracking-widest text-[10px]">
                          Tentar de novo
                      </Button>
                  </CardContent>
              </Card>
          </div>
      )
  }

  // ADMIN-19: mudar o plano não pede a senha
  const confirmChangePlan = async () => {
    try {
      setIsSubmitting(true)
      const updatedUser = await updateAdminUser(user.id, { plan: newPlan as Plano })
      setUser(updatedUser)
      toast.success(`Plano de ${user.name} alterado para ${NOMES_DOS_PLANOS[newPlan] ?? newPlan}.`)
      setIsChangePlanModalOpen(false)
      loadLogs()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao alterar plano" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmArchive = async () => {
    if (!adminPassword) return

    try {
      setIsSubmitting(true)
      await deleteAdminUser(user.id, adminPassword)
      toast.success(`Usuário ${user.name} arquivado com sucesso.`)
      setIsArchiveModalOpen(false)
      setAdminPassword("")
      setUser({ ...user, is_active: false })
      loadLogs()
    } catch (error) {
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Erro ao arquivar usuário" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmHardDelete = async () => {
    if (!adminPassword || !emailConfere(user.email, emailDigitado)) return

    try {
      setIsSubmitting(true)
      await hardDeleteAdminUser(user.id, adminPassword)
      // A resposta não traz o nome; vale o que a tela já tem (LGPD-21)
      toast.success(`Usuário ${user.name} excluído permanentemente.`)
      setIsHardDeleteModalOpen(false)
      router.push("/admin/usuarios")
    } catch (error) {
      // LGPD-12: com o Cloudinary fora, nada foi apagado e o backend explica (503 deletion_failed)
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Erro ao excluir usuário permanentemente" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmClearData = async () => {
    if (!adminPassword || !emailConfere(user.email, emailDigitado)) return

    try {
      setIsSubmitting(true)
      const resposta = await clearAdminUserData(user.id, adminPassword)
      toast.success(`Todos os dados de ${user.name} foram excluídos. O login foi mantido.`)
      setIsClearDataModalOpen(false)
      setAdminPassword("")
      setEmailDigitado("")
      loadLogs()
      // As estatísticas do cadastro novo, calculadas pela API
      setFinancialStats(resposta.financial_stats)
    } catch (error) {
      // 503 clear_failed: nada foi apagado; 400 own_account: o detail do backend
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Erro ao limpar dados do usuário" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmResetPassword = async () => {
    if (!newPassword || !adminPassword) return

    try {
      setIsSubmitting(true)
      await resetAdminUserPassword(user.id, {
        new_password: newPassword,
        admin_password: adminPassword
      })
      toast.success(`Senha de ${user.name} redefinida com sucesso.`)
      setIsResetModalOpen(false)
      setNewPassword("")
      setAdminPassword("")
      loadLogs()
    } catch (error) {
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Erro ao resetar senha" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const mudarSenha = (valor: string) => {
    setAdminPassword(valor)
    setErroSenha("")
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col gap-6">
          {voltar}

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-6">
                 <Avatar className="h-24 w-24 border-4 border-card shadow-2xl ring-2 ring-primary/20">
                    <AvatarImage src={getAbsoluteUrl(user.avatar_url)} alt={user.name} className="object-cover" />
                    <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary">
                        {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                 </Avatar>
                 <div className="space-y-1">
                     <h1 className="text-3xl font-black tracking-tight">{user.name}</h1>
                     <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs opacity-70">ID: {user.id.substring(0,8)}...</Badge>
                        <Badge className={`${user.is_active ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'} border-0`}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                            {user.plan === 'PREMIUM_PLUS' ? 'Premium Plus' : user.plan === 'PREMIUM' ? 'Premium' : 'Gratuito'}
                        </Badge>
                     </div>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                        <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {user.email}</span>
                        {user.phone_number && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {user.phone_number}</span>}
                     </div>
                 </div>
              </div>
              
              {botoesDeAcao(true)}
          </div>
      </div>

      <Separator className="bg-border/50" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="overview" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Visão Geral</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Logs de Atividade</TabsTrigger>
        </TabsList>

        {/* --- OVERVIEW TAB --- */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Financial Summary Cards */}
                <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm md:col-span-3 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="h-5 w-5 text-primary" /> Resumo Financeiro (Média Diária)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 group hover:bg-emerald-500/15 transition-colors">
                             <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">Receitas (Méd. Valor)</p>
                             <p className="text-2xl font-black text-emerald-600 leading-tight">
                                 {formatarMoeda(financialStats?.avg_income_value)}
                             </p>
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600/60 uppercase pt-1">
                                <Activity className="h-3 w-3" /> {financialStats?.income_count_per_day?.toFixed(1) || 0} registros/dia
                             </div>
                         </div>
                         <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1 group hover:bg-red-500/15 transition-colors">
                             <p className="text-xs font-bold uppercase tracking-wider text-red-600/70">Despesas (Méd. Valor)</p>
                             <p className="text-2xl font-black text-red-600 leading-tight">
                                 {formatarMoeda(financialStats?.avg_expense_value)}
                             </p>
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600/60 uppercase pt-1">
                                <Activity className="h-3 w-3" /> {financialStats?.expense_count_per_day?.toFixed(1) || 0} registros/dia
                             </div>
                         </div>
                          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                             <p className="text-xs font-bold uppercase tracking-wider text-blue-600/70">Saldo Total</p>
                             <p className="text-2xl font-black text-blue-600">
                                 {formatarMoeda(financialStats?.total_balance)}
                             </p>
                             <Wallet className="h-4 w-4 text-blue-500 opacity-50" />
                         </div>
                    </CardContent>
                </Card>

                {/* Account Details Card */}
                <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Detalhes da Conta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Criado em</span>
                            <span className="text-sm font-bold">{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> CPF</span>
                            <span className="text-sm font-bold">{user.cpf || "Não informado"}</span>
                        </div>
                         <div className="flex items-center justify-between border-b border-border/50 pb-3">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Email Verificado</span>
                            <Badge variant={user.emailVerified ? "default" : "destructive"} className="text-[10px]">
                                {user.emailVerified ? "SIM" : "NÃO"}
                            </Badge>
                        </div>
                        {/* ADMIN-06: sem cobrança, o plano fica aqui, sem aba de assinatura */}
                        <div className="flex items-center justify-between gap-3 pb-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Plano</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{NOMES_DOS_PLANOS[user.plan] ?? user.plan}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 rounded-xl font-black text-[10px] uppercase tracking-widest border-primary/20 hover:bg-primary/10"
                                    onClick={() => { setNewPlan(user.plan); setIsChangePlanModalOpen(true) }}
                                >
                                    Alterar plano
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

        </TabsContent>

        {/* --- LOGS TAB --- */}
         <TabsContent value="logs" className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
             <Card className="border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" /> Linha do Tempo
                    </CardTitle>
                    <CardDescription>Histórico de ações e eventos relacionados ao usuário.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative border-l border-border/50 ml-3 space-y-8 py-2">
                        {Array.isArray(logs) && logs.map((log) => (
                            <div key={log.id} className="relative pl-8 group">
                                <span className={`absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ${log.action.includes('FAILED') || log.action.includes('DELETE') ? 'bg-red-500' : 'bg-primary'}`} />
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <p className={`font-bold text-sm ${log.action.includes('FAILED') ? 'text-red-500' : 'text-foreground'}`}>
                                        {log.description}
                                    </p>
                                    <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Ação: <span className="font-bold">{rotuloDaAcao(log.action)}</span> • Autor: {log.admin_email}
                                </p>
                                {/* ADMIN-14: o antes e o depois de cada registro */}
                                <ValoresDoLog log={log} />
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="p-0">
                    <Paginacao
                        pagina={logsPage}
                        totalDePaginas={logsTotalPages}
                        total={logsCount}
                        rotulo="registros"
                        onMudarPagina={setLogsPage}
                    />
                </CardFooter>
             </Card>
         </TabsContent>


         {/* Modal de Alteração de Plano (ADMIN-19: sem senha) */}
         <Dialog open={isChangePlanModalOpen} onOpenChange={setIsChangePlanModalOpen}>
            <DialogContent className="rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl max-w-sm">
            <DialogHeader>
                <DialogTitle className="font-black uppercase tracking-tight">Alterar Plano</DialogTitle>
                <DialogDescription className="text-xs font-medium">
                Selecione o novo nível de acesso para <strong>{user.name}</strong>.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Novo Plano</Label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger aria-label="Novo plano" className="rounded-xl border-border/40 bg-muted/20">
                    <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="COMMON">GRATUITO</SelectItem>
                    <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                    <SelectItem value="PREMIUM_PLUS">PREMIUM PLUS</SelectItem>
                    </SelectContent>
                </Select>
                </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsChangePlanModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                <Button
                    onClick={confirmChangePlan}
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90"
                    disabled={isSubmitting || newPlan === user.plan}
                >
                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                Confirmar Alteração
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Arquivamento (SOFT DELETE) */}
        <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
            <DialogContent className="rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl max-w-md">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Archive className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="font-black text-xl uppercase tracking-tight">Arquivar Usuário</DialogTitle>
                </div>
                <DialogDescription className="text-sm font-medium text-foreground">
                    Ao arquivar <strong>{user.name}</strong>, o acesso ao sistema será bloqueado, mas os dados serão preservados.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Os dados financeiros permanecem no banco de dados.
                    </p>
                    <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        A conta pode ser restaurada a qualquer momento pelo admin.
                    </p>
                </div>

                <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
                <Button
                    onClick={confirmArchive}
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isSubmitting || !adminPassword}
                >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Archive className="h-3 w-3 mr-2" />}
                    CONFIRMAR ARQUIVAMENTO
                </Button>
                <Button variant="ghost" onClick={() => setIsArchiveModalOpen(false)} className="rounded-xl font-bold h-11">Cancelar</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Exclusão Permanente (IRREVERSÍVEL, ADMIN-20) */}
        <Dialog open={isHardDeleteModalOpen} onOpenChange={setIsHardDeleteModalOpen}>
            <DialogContent className="rounded-[32px] border-red-500/20 bg-background/95 backdrop-blur-xl max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <ShieldAlert className="h-6 w-6 text-red-600" />
                    </div>
                    <DialogTitle className="font-black text-xl uppercase tracking-tight text-red-600">Ação Irreversível</DialogTitle>
                </div>
                <DialogDescription className="text-sm font-medium text-foreground">
                    Você está prestes a excluir permanentemente a conta de <strong>{user.name}</strong> e todos os dados associados.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-6">
                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-red-600">O que será removido:</h4>
                    <ul className="space-y-2">
                        {APAGADO_NA_EXCLUSAO.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground">
                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter mt-4 text-center">
                        ESTA AÇÃO NÃO PODE SER DESFEITA EM NENHUMA HIPÓTESE.
                    </p>
                </div>

                <CampoDoEmailDeConfirmacao email={user.email} valor={emailDigitado} onChange={setEmailDigitado} />
                <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} className="border-red-500/20 bg-red-500/5" />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
                <Button
                    onClick={confirmHardDelete}
                    variant="destructive"
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-red-500/20"
                    disabled={isSubmitting || !adminPassword || !emailConfere(user.email, emailDigitado)}
                >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Trash2 className="h-3 w-3 mr-2" />}
                    EXCLUIR PERMANENTEMENTE
                </Button>
                <Button variant="ghost" onClick={() => setIsHardDeleteModalOpen(false)} className="rounded-xl font-bold h-11">Cancelar</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Reset de Senha */}
        <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
            <DialogContent className="rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl max-w-sm">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="font-black text-xl uppercase tracking-tight">Resetar Senha</DialogTitle>
                </div>
                <DialogDescription className="text-xs font-medium">
                Defina uma nova senha de acesso para <strong>{user.name}</strong>.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="space-y-2">
                <Label htmlFor="nova-senha-do-usuario" className="text-[10px] font-black uppercase tracking-widest opacity-50">Nova Senha do Usuário</Label>
                <Input
                    id="nova-senha-do-usuario"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className="rounded-xl border-border/40 bg-muted/20 focus:ring-primary/20"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                />
                </div>

                <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsResetModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                <Button
                    onClick={confirmResetPassword}
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90"
                    disabled={isSubmitting || !newPassword || !adminPassword}
                >
                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                CONFIRMAR RESET
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Limpar Dados (ADMIN-20 a ADMIN-23) */}
        <Dialog open={isClearDataModalOpen} onOpenChange={setIsClearDataModalOpen}>
            <DialogContent className="rounded-[32px] border-amber-500/30 bg-background/95 backdrop-blur-xl max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Eraser className="h-6 w-6 text-amber-600" />
                    </div>
                    <DialogTitle className="font-black text-xl uppercase tracking-tight text-amber-600">Limpar Dados do Usuário</DialogTitle>
                </div>
                <DialogDescription className="text-sm font-medium text-foreground">
                    Você está prestes a excluir todos os registros de <strong>{user.name}</strong>, mas manterá o acesso dele ao sistema. Ele fica como um cadastro novo.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-6">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-600">O que será apagado:</h4>
                    <ul className="space-y-2">
                        {APAGADO_NA_LIMPEZA.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground">
                                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                <span>{item}</span>
                            </li>
                        ))}
                        <li className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>Ficam: {MANTIDO_NA_LIMPEZA}</span>
                        </li>
                    </ul>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-tighter mt-4 text-center">
                        ESSA EXCLUSÃO DE DADOS É IRREVERSÍVEL.
                    </p>
                </div>

                <CampoDoEmailDeConfirmacao email={user.email} valor={emailDigitado} onChange={setEmailDigitado} />
                <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} className="border-amber-500/20 bg-amber-500/5" />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
                <Button
                    onClick={confirmClearData}
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={isSubmitting || !adminPassword || !emailConfere(user.email, emailDigitado)}
                >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Eraser className="h-3 w-3 mr-2" />}
                    LIMPAR DADOS
                </Button>
                <Button variant="ghost" onClick={() => setIsClearDataModalOpen(false)} className="rounded-xl font-bold h-11">Cancelar</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  )
}
