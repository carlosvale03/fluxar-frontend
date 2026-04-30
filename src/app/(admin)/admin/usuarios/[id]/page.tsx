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
    Users, CreditCard, ShieldCheck, Activity, Loader2, 
    ArrowLeft, Mail, Phone, Calendar, MapPin, 
    TrendingUp, TrendingDown, Wallet, Clock, AlertCircle, CheckCircle2,
    Edit2, Eye, EyeOff, AlertTriangle, Trash2, ShieldAlert, Archive, Eraser
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
    clearAdminUserData
} from "@/services/admin"
import { toast } from "sonner"
import { User } from "@/contexts/auth-context"
import { getAbsoluteUrl } from "@/lib/utils"

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [financialStats, setFinancialStats] = useState<UserFinancialStats | null>(null)
  const [logs, setLogs] = useState<SystemLog[]>([])

  // Modal Alterar Plano
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false)
  const [newPlan, setNewPlan] = useState<string>("COMMON")
  const [adminPassword, setAdminPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modais de Exclusão/Arquivamento
  const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false)

  // Modal Reset Senha
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  const loadLogs = async () => {
    if (!userId) return
    try {
        const logsData = await getUserLogs(userId)
        setLogs(logsData)
    } catch (error) {
        console.error("Erro ao carregar logs:", error)
    }
  }

  useEffect(() => {
    async function loadData() {
        if (!userId) return

        try {
            setIsLoading(true)
            const [userData, statsData, logsData] = await Promise.all([
                getAdminUser(userId),
                getUserFinancialStats(userId),
                getUserLogs(userId)
            ])
            setUser(userData)
            setFinancialStats(statsData)
            setLogs(logsData)
            setNewPlan(userData.plan)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar detalhes do usuário.")
            router.push("/admin/usuarios")
        } finally {
            setIsLoading(false)
        }
    }
    loadData()
  }, [userId, router])

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Carregando Perfil...</p>
          </div>
      )
  }

  if (!user) return null

  const confirmChangePlan = async () => {
    if (!adminPassword) {
        toast.error("Senha de administrador requerida.")
        return
    }

    try {
      setIsSubmitting(true)
      const updatedUser = await updateAdminUser(user.id, { 
        plan: newPlan as any,
        admin_password: adminPassword 
      })
      setUser(updatedUser)
      toast.success(`Plano de ${user.name} alterado para ${newPlan}.`)
      setIsChangePlanModalOpen(false)
      setAdminPassword("")
      loadLogs()
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao alterar plano"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmArchive = async () => {
    if (!adminPassword) {
        toast.error("Senha de administrador requerida.")
        return
    }

    try {
      setIsSubmitting(true)
      await deleteAdminUser(user.id, adminPassword)
      toast.success(`Usuário ${user.name} arquivado com sucesso.`)
      setIsArchiveModalOpen(false)
      // Atualizar o estado local ou recarregar
      setUser({ ...user, is_active: false })
      loadLogs()
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao arquivar usuário"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmHardDelete = async () => {
    if (!adminPassword) {
        toast.error("Senha de administrador requerida.")
        return
    }

    try {
      setIsSubmitting(true)
      await hardDeleteAdminUser(user.id, adminPassword)
      toast.success(`Usuário ${user.name} excluído permanentemente.`)
      setIsHardDeleteModalOpen(false)
      router.push("/admin/usuarios")
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao excluir usuário permanentemente"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmClearData = async () => {
    if (!adminPassword) {
        toast.error("Senha de administrador requerida.")
        return
    }

    try {
      setIsSubmitting(true)
      await clearAdminUserData(user.id, adminPassword)
      toast.success(`Todos os dados de ${user.name} foram excluídos. O login foi mantido.`)
      setIsClearDataModalOpen(false)
      setAdminPassword("")
      loadLogs()
      
      // Limpa os status financeiros locais para refletir na interface
      setFinancialStats({
          total_balance: 0,
          avg_income_value: 0,
          avg_expense_value: 0,
          income_count_per_day: 0,
          expense_count_per_day: 0,
          last_transaction_date: "Sem dados"
      })
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao limpar dados do usuário"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmResetPassword = async () => {
    if (!newPassword || !adminPassword) {
        toast.error("Nova senha e senha de administrador são requeridas.")
        return
    }

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
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao resetar senha"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-6">
          <Button 
            variant="ghost" 
            className="w-fit pl-0 hover:bg-transparent hover:text-primary transition-colors duration-200" 
            onClick={() => router.back()}
          >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
          </Button>

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
              
              <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="font-bold border-primary/20 hover:bg-primary/10"
                    onClick={() => setIsResetModalOpen(true)}
                  >
                      Resetar Senha
                  </Button>
                  <Button 
                    variant="outline" 
                    className="font-bold border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                    onClick={() => setIsClearDataModalOpen(true)}
                  >
                      <Eraser className="mr-2 h-4 w-4" /> Limpar Dados
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="font-bold bg-muted/50 hover:bg-muted text-foreground"
                    onClick={() => setIsArchiveModalOpen(true)}
                  >
                      <Archive className="mr-2 h-4 w-4" /> Arquivar Conta
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="font-bold shadow-lg shadow-red-500/20"
                    onClick={() => setIsHardDeleteModalOpen(true)}
                  >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir Permanente
                  </Button>
              </div>
          </div>
      </div>

      <Separator className="bg-border/50" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="overview" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Visão Geral</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Logs de Atividade</TabsTrigger>
          <TabsTrigger value="subscription" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Assinatura</TabsTrigger>
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
                                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats?.avg_income_value || 0)}
                             </p>
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600/60 uppercase pt-1">
                                <Activity className="h-3 w-3" /> {financialStats?.income_count_per_day?.toFixed(1) || 0} registros/dia
                             </div>
                         </div>
                         <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1 group hover:bg-red-500/15 transition-colors">
                             <p className="text-xs font-bold uppercase tracking-wider text-red-600/70">Despesas (Méd. Valor)</p>
                             <p className="text-2xl font-black text-red-600 leading-tight">
                                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats?.avg_expense_value || 0)}
                             </p>
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600/60 uppercase pt-1">
                                <Activity className="h-3 w-3" /> {financialStats?.expense_count_per_day?.toFixed(1) || 0} registros/dia
                             </div>
                         </div>
                          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                             <p className="text-xs font-bold uppercase tracking-wider text-blue-600/70">Saldo Total</p>
                             <p className="text-2xl font-black text-blue-600">
                                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats?.total_balance || 0)}
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
                         <div className="flex items-center justify-between pb-1">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Email Verificado</span>
                            <Badge variant={user.emailVerified ? "default" : "destructive"} className="text-[10px]">
                                {user.emailVerified ? "SIM" : "NÃO"}
                            </Badge>
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
                                    Ação: <span className="font-mono font-bold">{log.action}</span> • Autor: {log.admin_name}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
             </Card>
         </TabsContent>

         {/* --- SUBSCRIPTION TAB (Placeholder) --- */}
         <TabsContent value="subscription" className="animate-in fade-in slide-in-from-right-2 duration-300">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm flex flex-col justify-between">
                    <CardHeader>
                        <CardTitle className="text-lg">Plano Atual</CardTitle>
                        <CardDescription>Nível de acesso do usuário no sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl ${
                            user.plan === 'PREMIUM_PLUS' ? 'bg-amber-500/20 text-amber-600' :
                            user.plan === 'PREMIUM' ? 'bg-primary/20 text-primary' :
                            'bg-muted text-muted-foreground'
                        }`}>
                            <ShieldCheck className="h-10 w-10" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black uppercase tracking-widest">{user.plan.replace('_', ' ')}</h3>
                            <p className="text-xs font-bold text-muted-foreground opacity-60">
                                {user.plan === 'COMMON' ? 'Assinatura Básica' : 'Assinatura Ativa'}
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 p-4">
                        <Button 
                            variant="outline" 
                            className="w-full font-black text-[10px] uppercase tracking-widest border-primary/20 hover:bg-primary/10 rounded-xl"
                            onClick={() => setIsChangePlanModalOpen(true)}
                        >
                            Alterar Plano Manualmente
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="lg:col-span-2 border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Histórico de Transações</CardTitle>
                                <CardDescription>Registros de pagamentos e mudanças de plano.</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-2">
                                Roadmap
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex gap-3 mb-4">
                                <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                                <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest leading-tight">
                                    Nota: Este painel exibirá dados reais assim que a integração com o gateway de pagamentos for concluída.
                                </p>
                            </div>
                            {/* Mock History */}
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 group hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Renovação Mensal - Premium</p>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Cartão de Crédito • ID: #TRX-9902</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-emerald-600">R$ 29,90</p>
                                    <p className="text-[10px] font-bold text-muted-foreground/60">05/02/2026</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 group hover:border-primary/20 transition-all opacity-60">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <ArrowLeft className="h-4 w-4 rotate-90" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Upgrade: Free → Premium</p>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Ação Administrativa</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary">GRATUITO</p>
                                    <p className="text-[10px] font-bold text-muted-foreground/60">12/01/2026</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-dashed border-border/50 pt-8 text-center">
                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
                                Carregar Histórico Completo
                            </Button>
                        </div>
                    </CardContent>
                </Card>
             </div>
         </TabsContent>

         {/* Modal de Alteração de Plano */}
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
                    <SelectTrigger className="rounded-xl border-border/40 bg-muted/20">
                    <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="COMMON">GRATUITO</SelectItem>
                    <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                    <SelectItem value="PREMIUM_PLUS">PREMIUM PLUS</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Sua Senha de Administrador</Label>
                <div className="relative">
                    <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha para confirmar"
                    className="rounded-xl border-border/40 bg-muted/5 focus:ring-primary/20 pr-10"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoComplete="new-password"
                    />
                    <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                    >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsChangePlanModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                <Button 
                    onClick={confirmChangePlan} 
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90"
                    disabled={isSubmitting}
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

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Confirme sua Senha de Administrador</Label>
                    <div className="relative">
                        <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Sua senha de acesso admin"
                            className="rounded-xl border-border/40 bg-muted/20 focus:ring-primary/20 pr-10"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
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

        {/* Modal de Exclusão Permanente (IRREVERSÍVEL) */}
        <Dialog open={isHardDeleteModalOpen} onOpenChange={setIsHardDeleteModalOpen}>
            <DialogContent className="rounded-[32px] border-red-500/20 bg-background/95 backdrop-blur-xl max-w-md">
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
                        <li className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground">
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                            <span>TODAS as transações, contas bancárias e cartões.</span>
                        </li>
                        <li className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground">
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                            <span>Metas, categorias personalizadas e tags.</span>
                        </li>
                        <li className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground">
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                            <span>Dados de perfil, avatar e configurações de acesso.</span>
                        </li>
                    </ul>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter mt-4 text-center">
                        ESTA AÇÃO NÃO PODE SER DESFEITA EM NENHUMA HIPÓTESE.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Confirme sua Senha de Administrador</Label>
                    <div className="relative">
                        <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Sua senha de acesso admin"
                            className="rounded-xl border-red-500/20 bg-red-500/5 focus:ring-red-500/20 pr-10"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
                <Button 
                    onClick={confirmHardDelete} 
                    variant="destructive"
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-red-500/20"
                    disabled={isSubmitting || !adminPassword}
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
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Nova Senha do Usuário</Label>
                <div className="relative">
                    <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        className="rounded-xl border-border/40 bg-muted/20 focus:ring-primary/20 pr-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>
                </div>

                <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Sua Senha de Administrador</Label>
                <div className="relative">
                    <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirme sua identidade"
                        className="rounded-xl border-border/40 bg-muted/5 focus:ring-primary/20 pr-10"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                </div>
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

        {/* Modal de Limpar Dados (Clear Data) */}
        <Dialog open={isClearDataModalOpen} onOpenChange={setIsClearDataModalOpen}>
            <DialogContent className="rounded-[32px] border-amber-500/30 bg-background/95 backdrop-blur-xl max-w-md">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Eraser className="h-6 w-6 text-amber-600" />
                    </div>
                    <DialogTitle className="font-black text-xl uppercase tracking-tight text-amber-600">Limpar Dados do Usuário</DialogTitle>
                </div>
                <DialogDescription className="text-sm font-medium text-foreground">
                    Você está prestes a excluir todos os registros de <strong>{user.name}</strong>, mas manterá o acesso dele ao sistema.
                </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-6">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-600">O que vai acontecer:</h4>
                    <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground">
                            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                            <span>Transações, contas bancárias, cartões, metas e orçamentos serão <strong>excluídos permanentemente</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>O login, a senha, os dados do perfil e a assinatura <strong>serão mantidos</strong>.</span>
                        </li>
                    </ul>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-tighter mt-4 text-center">
                        ESSA EXCLUSÃO DE DADOS É IRREVERSÍVEL.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Confirme sua Senha de Administrador</Label>
                    <div className="relative">
                        <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Sua senha de acesso admin"
                            className="rounded-xl border-amber-500/20 bg-amber-500/5 focus:ring-amber-500/20 pr-10"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
                <Button 
                    onClick={confirmClearData} 
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={isSubmitting || !adminPassword}
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
