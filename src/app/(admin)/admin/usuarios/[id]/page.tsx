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
import { nomeDoPlano } from "@/hooks/use-plan"

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
        tratarErro(error, { mensagemPadrao: "Não foi possível carregar os logs.", tentarDeNovo: loadLogs })
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
        tratarErro(error, { mensagemPadrao: "Não foi possível carregar os detalhes do usuário.", tentarDeNovo: loadData })
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
            onClick={() => abrir(setIsResetModalOpen)}
            disabled={!habilitados}
          >
              Resetar Senha
          </Button>
          <Button
            variant="outline"
            className="text-warn hover:text-warn"
            onClick={() => abrir(setIsClearDataModalOpen)}
            disabled={!habilitados}
          >
              <Eraser className="h-4 w-4" aria-hidden="true" /> Limpar Dados
          </Button>
          <Button
            variant="secondary"
            onClick={() => abrir(setIsArchiveModalOpen)}
            disabled={!habilitados}
          >
              <Archive className="h-4 w-4" aria-hidden="true" /> Arquivar Conta
          </Button>
          <Button
            variant="destructive"
            onClick={() => abrir(setIsHardDeleteModalOpen)}
            disabled={!habilitados}
          >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Excluir Permanente
          </Button>
      </div>
  )

  const voltar = (
      <Button
        variant="ghost"
        className="w-fit pl-0 hover:bg-transparent hover:text-foreground"
        onClick={() => router.back()}
      >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para Lista
      </Button>
  )

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="label text-muted-foreground">Carregando perfil</p>
          </div>
      )
  }

  if (!user) {
      return (
          <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl">
              <div className="flex flex-col gap-6">
                  {voltar}
                  {botoesDeAcao(false)}
              </div>
              <Card role="alert" className="border-l-[3px] border-l-outflow">
                  <CardContent className="flex flex-col items-center text-center gap-4 p-10">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-elevated">
                          <AlertCircle className="h-6 w-6 text-outflow" aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                          <h2 className="display-m">Não foi possível carregar o usuário</h2>
                          <p className="text-sm text-muted-foreground">
                              {erroAoCarregar
                                ? "Os dados não chegaram da API. Nenhuma ação fica disponível até eles carregarem."
                                : "Usuário não informado."}
                          </p>
                      </div>
                      <Button onClick={loadData}>
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
      toast.success(`Plano de ${user.name} alterado para ${nomeDoPlano(newPlan as Plano)}.`)
      setIsChangePlanModalOpen(false)
      loadLogs()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível alterar o plano. Tente de novo." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmArchive = async () => {
    if (!adminPassword) return

    try {
      setIsSubmitting(true)
      await deleteAdminUser(user.id, adminPassword)
      toast.success(`Usuário ${user.name} arquivado.`)
      setIsArchiveModalOpen(false)
      setAdminPassword("")
      setUser({ ...user, is_active: false })
      loadLogs()
    } catch (error) {
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Não foi possível arquivar o usuário. Tente de novo." })
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
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Não foi possível excluir o usuário. Tente de novo." })
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
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Não foi possível limpar os dados do usuário. Tente de novo." })
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
      toast.success(`Senha de ${user.name} redefinida.`)
      setIsResetModalOpen(false)
      setNewPassword("")
      setAdminPassword("")
      loadLogs()
    } catch (error) {
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Não foi possível redefinir a senha. Tente de novo." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const mudarSenha = (valor: string) => {
    setAdminPassword(valor)
    setErroSenha("")
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl">
      
      <div className="flex flex-col gap-6">
          {voltar}

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-6">
                 <Avatar className="h-24 w-24 border border-border-strong">
                    <AvatarImage src={getAbsoluteUrl(user.avatar_url)} alt={user.name} className="object-cover" />
                    <AvatarFallback className="bg-elevated font-mono text-3xl">
                        {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                 </Avatar>
                 <div className="space-y-1">
                     <h1 className="display-l">{user.name}</h1>
                     <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">ID: {user.id.substring(0,8)}...</Badge>
                        <Badge variant={user.is_active ? "success" : "destructive"}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="destino">
                            {nomeDoPlano(user.plan as Plano)}
                        </Badge>
                     </div>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                        <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" aria-hidden="true" /> {user.email}</span>
                        {user.phone_number && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" aria-hidden="true" /> {user.phone_number}</span>}
                     </div>
                 </div>
              </div>
              
              {botoesDeAcao(true)}
          </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="logs">Logs de Atividade</TabsTrigger>
        </TabsList>

        {/* --- OVERVIEW TAB --- */}
        <TabsContent value="overview" className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Financial Summary Cards */}
                <Card className="md:col-span-3 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> Resumo Financeiro (Média Diária)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <div className="space-y-1 rounded-md border border-border bg-elevated p-4">
                             <p className="label text-muted-foreground">Entradas (Méd. Valor)</p>
                             <p className="value-l text-inflow">
                                 {formatarMoeda(financialStats?.avg_income_value)}
                             </p>
                             <div className="flex items-center gap-1.5 pt-1 font-mono text-xs text-muted-foreground">
                                <Activity className="h-3 w-3" aria-hidden="true" /> {financialStats?.income_count_per_day?.toFixed(1) || 0} registros/dia
                             </div>
                         </div>
                         <div className="space-y-1 rounded-md border border-border bg-elevated p-4">
                             <p className="label text-muted-foreground">Saídas (Méd. Valor)</p>
                             <p className="value-l text-outflow">
                                 {formatarMoeda(financialStats?.avg_expense_value)}
                             </p>
                             <div className="flex items-center gap-1.5 pt-1 font-mono text-xs text-muted-foreground">
                                <Activity className="h-3 w-3" aria-hidden="true" /> {financialStats?.expense_count_per_day?.toFixed(1) || 0} registros/dia
                             </div>
                         </div>
                          <div className="space-y-1 rounded-md border border-border bg-elevated p-4">
                             <p className="label text-muted-foreground">Saldo Total</p>
                             <p className="value-l text-foreground">
                                 {formatarMoeda(financialStats?.total_balance)}
                             </p>
                             <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                         </div>
                    </CardContent>
                </Card>

                {/* Account Details Card */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Detalhes da Conta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" aria-hidden="true" /> Criado em</span>
                            <span className="font-mono text-sm">{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" aria-hidden="true" /> CPF</span>
                            <span className="font-mono text-sm">{user.cpf || "Não informado"}</span>
                        </div>
                         <div className="flex items-center justify-between border-b border-border pb-3">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Email Verificado</span>
                            <Badge variant={user.emailVerified ? "success" : "destructive"}>
                                {user.emailVerified ? "Sim" : "Não"}
                            </Badge>
                        </div>
                        {/* ADMIN-06: sem cobrança, o plano fica aqui, sem aba de assinatura */}
                        <div className="flex items-center justify-between gap-3 pb-1">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Plano</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{nomeDoPlano(user.plan as Plano)}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7"
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
         <TabsContent value="logs" className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> Linha do Tempo
                    </CardTitle>
                    <CardDescription>Histórico de ações e eventos relacionados ao usuário.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative ml-3 space-y-8 border-l border-border py-2">
                        {Array.isArray(logs) && logs.map((log) => (
                            <div key={log.id} className="relative pl-8">
                                <span className={`absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card ${log.action.includes('FAILED') || log.action.includes('DELETE') ? 'bg-outflow' : 'bg-gold'}`} aria-hidden="true" />
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <p className={`text-sm font-semibold ${log.action.includes('FAILED') ? 'text-outflow' : 'text-foreground'}`}>
                                        {log.description}
                                    </p>
                                    <span className="rounded-sm bg-elevated px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Ação: <span className="font-semibold">{rotuloDaAcao(log.action)}</span> · Autor: {log.admin_email}
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
            <DialogContent className="max-w-sm">
            <DialogHeader>
                <DialogTitle className="display-m">Alterar Plano</DialogTitle>
                <DialogDescription>
                Selecione o novo nível de acesso para <strong>{user.name}</strong>.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="space-y-2">
                <Label className="label text-muted-foreground">Novo Plano</Label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger aria-label="Novo plano">
                    <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="COMMON">COMUM</SelectItem>
                    <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                    <SelectItem value="PREMIUM_PLUS">PREMIUM PLUS</SelectItem>
                    </SelectContent>
                </Select>
                </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsChangePlanModalOpen(false)}>Cancelar</Button>
                <Button
                    onClick={confirmChangePlan}
                    disabled={isSubmitting || newPlan === user.plan}
                >
                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                Confirmar Alteração
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Arquivamento (SOFT DELETE) */}
        <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
            <DialogContent className="max-w-md">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-elevated">
                        <Archive className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <DialogTitle className="display-m">Arquivar Usuário</DialogTitle>
                </div>
                <DialogDescription className="text-foreground">
                    Ao arquivar <strong>{user.name}</strong>, o acesso ao sistema será bloqueado, mas os dados serão preservados.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="space-y-2 rounded-md border border-border bg-elevated p-4">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-inflow" aria-hidden="true" />
                        Os dados financeiros permanecem no banco de dados.
                    </p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-inflow" aria-hidden="true" />
                        A conta pode ser restaurada a qualquer momento pelo admin.
                    </p>
                </div>

                <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
                <Button
                    onClick={confirmArchive}
                    disabled={isSubmitting || !adminPassword}
                >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Archive className="h-3 w-3" aria-hidden="true" />}
                    Confirmar arquivamento
                </Button>
                <Button variant="ghost" onClick={() => setIsArchiveModalOpen(false)}>Cancelar</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Exclusão Permanente (IRREVERSÍVEL, ADMIN-20) */}
        <Dialog open={isHardDeleteModalOpen} onOpenChange={setIsHardDeleteModalOpen}>
            <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-elevated">
                        <ShieldAlert className="h-6 w-6 text-outflow" aria-hidden="true" />
                    </div>
                    <DialogTitle className="display-m text-outflow">Ação Irreversível</DialogTitle>
                </div>
                <DialogDescription className="text-foreground">
                    Você está prestes a excluir permanentemente a conta de <strong>{user.name}</strong> e todos os dados associados.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-6">
                <div className="space-y-3 rounded-r-md border border-border border-l-[3px] border-l-outflow bg-card p-4">
                    <h3 className="label text-outflow">O que será removido:</h3>
                    <ul className="space-y-2">
                        {APAGADO_NA_EXCLUSAO.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-outflow" aria-hidden="true" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-center text-sm font-semibold text-outflow">
                        Esta ação não pode ser desfeita.
                    </p>
                </div>

                <CampoDoEmailDeConfirmacao email={user.email} valor={emailDigitado} onChange={setEmailDigitado} />
                <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
                <Button
                    onClick={confirmHardDelete}
                    variant="destructive"
                    disabled={isSubmitting || !adminPassword || !emailConfere(user.email, emailDigitado)}
                >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3 w-3" aria-hidden="true" />}
                    Excluir permanentemente
                </Button>
                <Button variant="ghost" onClick={() => setIsHardDeleteModalOpen(false)}>Cancelar</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Reset de Senha */}
        <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
            <DialogContent className="max-w-sm">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-elevated">
                        <ShieldCheck className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <DialogTitle className="display-m">Resetar Senha</DialogTitle>
                </div>
                <DialogDescription>
                Defina uma nova senha de acesso para <strong>{user.name}</strong>.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="space-y-2">
                <Label htmlFor="nova-senha-do-usuario" className="label text-muted-foreground">Nova Senha do Usuário</Label>
                <Input
                    id="nova-senha-do-usuario"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                />
                </div>

                <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsResetModalOpen(false)}>Cancelar</Button>
                <Button
                    onClick={confirmResetPassword}
                    disabled={isSubmitting || !newPassword || !adminPassword}
                >
                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                Confirmar reset
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal de Limpar Dados (ADMIN-20 a ADMIN-23) */}
        <Dialog open={isClearDataModalOpen} onOpenChange={setIsClearDataModalOpen}>
            <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-elevated">
                        <Eraser className="h-6 w-6 text-warn" aria-hidden="true" />
                    </div>
                    <DialogTitle className="display-m text-warn">Limpar Dados do Usuário</DialogTitle>
                </div>
                <DialogDescription className="text-foreground">
                    Você está prestes a excluir todos os registros de <strong>{user.name}</strong>, mas manterá o acesso dele ao sistema. Ele fica como um cadastro novo.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-6">
                <div className="space-y-3 rounded-r-md border border-border border-l-[3px] border-l-warn bg-card p-4">
                    <h3 className="label text-warn">O que será apagado:</h3>
                    <ul className="space-y-2">
                        {APAGADO_NA_LIMPEZA.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warn" aria-hidden="true" />
                                <span>{item}</span>
                            </li>
                        ))}
                        <li className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-inflow" aria-hidden="true" />
                            <span>Ficam: {MANTIDO_NA_LIMPEZA}</span>
                        </li>
                    </ul>
                    <p className="mt-4 text-center text-sm font-semibold text-warn">
                        Esta exclusão de dados não pode ser desfeita.
                    </p>
                </div>

                <CampoDoEmailDeConfirmacao email={user.email} valor={emailDigitado} onChange={setEmailDigitado} />
                <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
                <Button
                    variant="destructive"
                    onClick={confirmClearData}
                    disabled={isSubmitting || !adminPassword || !emailConfere(user.email, emailDigitado)}
                >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Eraser className="h-3 w-3" aria-hidden="true" />}
                    Limpar dados
                </Button>
                <Button variant="ghost" onClick={() => setIsClearDataModalOpen(false)}>Cancelar</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  )
}
