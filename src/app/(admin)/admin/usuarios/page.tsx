"use client"

import { useState, useEffect } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  getAdminUsers, 
  updateAdminUser, 
  deleteAdminUser,
  bulkDeleteAdminUsers
} from "@/services/admin"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { User } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  MoreHorizontal, 
  Shield, 
  User as UserIcon, 
  ChevronRight,
  ChevronLeft,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  AlertTriangle,
  Archive,
  RotateCcw,
  ListChecks
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
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
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAbsoluteUrl, cn } from "@/lib/utils"

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [viewArchived, setViewArchived] = useState(false)
  const [filterRole, setFilterRole] = useState<string>("ALL")
  const [filterPlan, setFilterPlan] = useState<string>("ALL")

  // Seleção
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { user: currentUser } = useAuth()

  // Diálogos
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false)
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pendingRole, setPendingRole] = useState<string>("")
  
  // Inputs dos diálogos
  const [adminPassword, setAdminPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [newPlan, setNewPlan] = useState<string>("COMMON")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce para busca no servidor
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Volta para a primeira página ao buscar
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const data = await getAdminUsers(
        page, 
        debouncedSearch, 
        viewArchived, 
        filterRole === "ALL" ? undefined : filterRole,
        filterPlan === "ALL" ? undefined : filterPlan
      )
      setUsers(data.results)
      setTotalCount(data.count)
    } catch (error) {
      console.error("Failed to load users", error)
      toast.error("Erro ao carregar lista de usuários")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [page, debouncedSearch, viewArchived, filterRole, filterPlan])

  const handleToggleRole = (user: User) => {
    setSelectedUser(user)
    setPendingRole(user.role === "ADMIN" ? "USER" : "ADMIN")
    setAdminPassword("")
    setIsChangeRoleModalOpen(true)
  }

  const confirmChangeRole = async () => {
    if (!selectedUser || !adminPassword) return

    try {
      setIsSubmitting(true)
      await updateAdminUser(selectedUser.id, { 
        role: pendingRole as 'ADMIN' | 'USER',
        admin_password: adminPassword 
      })
      toast.success(`Cargo de ${selectedUser.name} alterado para ${pendingRole}.`)
      setIsChangeRoleModalOpen(false)
      loadUsers()
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao alterar cargo"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveUser = async (user: User) => {
    setSelectedUser(user)
    setAdminPassword("")
    setIsDeleteModalOpen(true)
  }

  const handleRestoreUser = async (user: User) => {
    setSelectedUser(user)
    setAdminPassword("")
    setIsRestoreModalOpen(true)
  }

  const confirmArchive = async () => {
    if (!selectedUser || !adminPassword) return
    
    try {
      setIsSubmitting(true)
      await deleteAdminUser(selectedUser.id, adminPassword)
      toast.success(`Usuário ${selectedUser.name} arquivado com sucesso.`)
      setIsDeleteModalOpen(false)
      loadUsers()
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao arquivar usuário"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmRestore = async () => {
    if (!selectedUser || !adminPassword) return

    try {
      setIsSubmitting(true)
      await updateAdminUser(selectedUser.id, { 
        is_active: true,
        admin_password: adminPassword 
      })
      toast.success(`Usuário ${selectedUser.name} restaurado com sucesso.`)
      setIsRestoreModalOpen(false)
      loadUsers()
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao restaurar usuário"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePlan = (user: User) => {
    setSelectedUser(user)
    setNewPlan(user.plan)
    setAdminPassword("")
    setIsChangePlanModalOpen(true)
  }

  const confirmChangePlan = async () => {
    if (!selectedUser || !newPlan || !adminPassword) return

    try {
      setIsSubmitting(true)
      await updateAdminUser(selectedUser.id, { 
        plan: newPlan as any,
        admin_password: adminPassword 
      })
      toast.success(`Plano de ${selectedUser.name} alterado para ${newPlan}.`)
      setIsChangePlanModalOpen(false)
      loadUsers()
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao alterar plano"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(users.map(u => u.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkArchive = () => {
    setAdminPassword("")
    setIsBulkDeleteModalOpen(true)
  }

  const confirmBulkArchive = async () => {
    if (selectedIds.length === 0 || !adminPassword) return

    try {
      setIsSubmitting(true)
      await bulkDeleteAdminUsers(selectedIds, adminPassword)
      toast.success(`${selectedIds.length} usuários arquivados com sucesso.`)
      setIsBulkDeleteModalOpen(false)
      setSelectedIds([])
      setIsSelectionMode(false)
      loadUsers()
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao arquivar usuários"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">
          Buscando base de usuários...
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none uppercase">
              Gestão de Usuários
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 opacity-50">
              {isLoading ? "CARREGANDO..." : `${totalCount} USUÁRIOS CADASTRADOS`}
            </p>
          </div>
          
          <div className="flex gap-1 bg-muted/20 p-1 rounded-2xl border border-border/40 backdrop-blur-sm shadow-sm w-fit">
            <Button 
              variant={!viewArchived ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("rounded-xl px-4 py-1.5 text-xs font-bold transition-all", !viewArchived && "bg-background shadow-sm")}
              onClick={() => {
                setViewArchived(false)
                setPage(1)
              }}
            >
              Ativos
            </Button>
            <Button 
              variant={viewArchived ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("rounded-xl px-4 py-1.5 text-xs font-bold transition-all", viewArchived && "bg-background shadow-sm")}
              onClick={() => {
                setViewArchived(true)
                setPage(1)
              }}
            >
              Arquivados
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px] max-w-full sm:max-w-xs md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input 
              type="search"
              id="fluxar-admin-search-no-autofill"
              name="fluxar-search-query"
              placeholder="Buscar por nome ou e-mail..." 
              className="pl-10 rounded-2xl border-border/40 bg-background/50 focus:ring-primary/20 transition-all w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filterRole} onValueChange={(val) => {
              setFilterRole(val)
              setPage(1)
            }}>
              <SelectTrigger className="w-[110px] sm:w-[130px] rounded-2xl border-border/40 bg-background/50 font-bold text-[10px] uppercase tracking-widest">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Todos Cargos</SelectItem>
                <SelectItem value="ADMIN">Administradores</SelectItem>
                <SelectItem value="USER">Usuários</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPlan} onValueChange={(val) => {
              setFilterPlan(val)
              setPage(1)
            }}>
              <SelectTrigger className="w-[110px] sm:w-[130px] rounded-2xl border-border/40 bg-background/50 font-bold text-[10px] uppercase tracking-widest">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Todos Planos</SelectItem>
                <SelectItem value="COMMON">Gratuito</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
                <SelectItem value="PREMIUM_PLUS">Premium Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant={isSelectionMode ? "secondary" : "outline"}
            className={cn(
              "rounded-2xl font-bold gap-2 animate-in fade-in zoom-in duration-300 transition-all shrink-0 ml-auto sm:ml-0",
              isSelectionMode && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 scale-105"
            )}
            onClick={() => {
              setIsSelectionMode(!isSelectionMode)
              if (isSelectionMode) setSelectedIds([])
            }}
          >
            <ListChecks className="h-4 w-4" />
            <span className="inline-flex">{isSelectionMode ? "Concluir" : "Seleção"}</span>
          </Button>
        </div>
      </div>

      <div className="sm:border border-border/40 bg-card/30 backdrop-blur-md sm:rounded-[40px] rounded-none border-x-0 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40">
              {isSelectionMode && (
                <TableHead className="w-12 py-5 pl-4">
                  <Checkbox 
                    checked={users.length > 0 && selectedIds.length === users.length}
                    onCheckedChange={toggleSelectAll}
                    className="rounded-md border-primary data-[state=checked]:bg-primary transition-all cursor-pointer ring-offset-background"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 sm:py-5 font-black uppercase tracking-widest text-[10px] opacity-40">Usuário</TableHead>
              <TableHead className="py-3 sm:py-5 font-black uppercase tracking-widest text-[10px]">Plano</TableHead>
              <TableHead className="py-3 sm:py-5 font-black uppercase tracking-widest text-[10px]">Cargo</TableHead>
              <TableHead className="py-3 sm:py-5 font-black uppercase tracking-widest text-[10px] hidden sm:table-cell">Cadastro</TableHead>
              <TableHead className="w-[80px] sm:w-[100px] text-right py-3 sm:py-5 font-black uppercase tracking-widest text-[10px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-border/40 hover:bg-primary/5 transition-colors group">
                {isSelectionMode && (
                  <TableCell className="w-12">
                     <Checkbox 
                       checked={selectedIds.includes(user.id)}
                       onCheckedChange={() => toggleSelect(user.id)}
                       className="rounded-md border-primary data-[state=checked]:bg-primary transition-all cursor-pointer ring-offset-background"
                     />
                  </TableCell>
                )}
                <TableCell className="py-2.5 sm:py-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-primary/10 transition-transform group-hover:scale-110 duration-300">
                      <AvatarImage src={getAbsoluteUrl(user.avatar_url) || ""} />
                      <AvatarFallback className="font-black bg-primary/10 text-primary">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-black text-sm tracking-tight">{user.name}</span>
                      <span className="text-xs text-muted-foreground font-medium">{user.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "font-black tracking-widest text-[10px] uppercase rounded-full px-3 py-0.5",
                    user.plan === "PREMIUM_PLUS" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    user.plan === "PREMIUM" ? "bg-primary/10 text-primary border-primary/20" :
                    "bg-muted text-muted-foreground border-border"
                  )}>
                    {user.plan.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.role === "ADMIN" ? (
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-black tracking-widest text-[10px] uppercase rounded-full">
                        <Shield className="h-3 w-3 mr-1" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-black tracking-widest text-[10px] uppercase rounded-full">
                        <UserIcon className="h-3 w-3 mr-1" /> User
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs font-bold text-muted-foreground/70">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" asChild>
                      <Link href={`/admin/usuarios/${user.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
                      <DropdownMenuLabel className="font-black uppercase tracking-widest text-[10px] opacity-50">Ações Admin</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="font-bold flex items-center gap-2 cursor-pointer" onClick={() => handleToggleRole(user)}>
                        <Shield className="h-4 w-4" />
                        {user.role === "ADMIN" ? "Tirar Admin" : "Tornar Admin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="font-bold flex items-center gap-2 cursor-pointer" onClick={() => handleChangePlan(user)}>
                        <Edit2 className="h-4 w-4" /> Alterar Plano
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className={cn(
                          "font-bold flex items-center gap-2 cursor-pointer",
                          viewArchived ? "text-primary focus:text-primary" : "text-rose-500 focus:text-rose-500"
                        )}
                        onClick={() => viewArchived ? handleRestoreUser(user) : handleArchiveUser(user)}
                      >
                        {viewArchived ? (
                          <>
                            <RotateCcw className="h-4 w-4" /> Restaurar Conta
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4" /> Arquivar Conta
                          </>
                        )}
                      </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-t border-border/40 bg-muted/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 w-full sm:w-auto text-center sm:text-left">
             {users.length} de {totalCount} usuários
          </div>
          <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="flex-1 sm:flex-none rounded-xl h-8 px-4 font-black text-[10px] uppercase tracking-widest"
            >
              <ChevronLeft className="h-3 w-3 mr-1" /> Ant.
            </Button>
            <div className="text-[10px] font-black uppercase tracking-widest px-4 border-x border-border/20">
              {page}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => p + 1)}
              disabled={page * 10 >= totalCount || isLoading}
              className="flex-1 sm:flex-none rounded-xl h-8 px-4 font-black text-[10px] uppercase tracking-widest"
            >
              Próx. <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>

        {users.length === 0 && !isLoading && (
          <div className="py-20 text-center space-y-4">
             <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
                <UserIcon className="h-8 w-8" />
             </div>
             <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>

      {/* Floating Action Bar para Seleção em Massa */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-8 left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <div className="bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 ring-1 ring-primary/20">
              <div className="flex items-center gap-2">
                 <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-black text-primary-foreground">{selectedIds.length}</span>
                 </div>
                 <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-60">Selecionados</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-border/40" />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 sm:flex-none rounded-full font-bold h-8 sm:h-9 hover:bg-rose-500/10 hover:text-rose-500 transition-all flex items-center justify-center gap-2 cursor-pointer bg-rose-500/5 sm:bg-transparent"
                    onClick={handleBulkArchive}
                 >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[10px] sm:text-xs">Excluir</span>
                 </Button>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 sm:flex-none rounded-full font-bold h-8 sm:h-9 opacity-50 hover:opacity-100 cursor-pointer text-[10px] sm:text-xs"
                    onClick={() => {
                      setSelectedIds([])
                      setIsSelectionMode(false)
                    }}
                 >
                    Cancelar
                 </Button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Alteração de Plano */}
      <Dialog open={isChangePlanModalOpen} onOpenChange={setIsChangePlanModalOpen}>
        <DialogContent className="rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Alterar Plano</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Selecione o novo nível de acesso para <strong>{selectedUser?.name}</strong>.
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

      {/* Modal de Alteração de Cargo */}
      <Dialog open={isChangeRoleModalOpen} onOpenChange={setIsChangeRoleModalOpen}>
        <DialogContent className="rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary">Alterar Cargo</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Você está alterando o cargo de <strong>{selectedUser?.name}</strong> para <strong>{pendingRole}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
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

            {selectedUser?.id === currentUser?.id && pendingRole !== 'ADMIN' && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3 animate-pulse">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-[10px] font-bold text-orange-500 leading-tight uppercase tracking-widest">
                   Cuidado: Você está prestes a remover seu próprio cargo de administrador.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsChangeRoleModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button 
                onClick={confirmChangeRole} 
                className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90"
                disabled={!adminPassword || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Arquivamento Seguro */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-rose-500">Arquivar Conta</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              O usuário <strong>{selectedUser?.name}</strong> perderá o acesso, mas os dados serão preservados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Sua Senha de Administrador</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha para confirmar"
                  className="rounded-xl border-border/40 bg-rose-500/5 focus:ring-rose-500/20 pr-10"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} type="button">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {selectedUser?.id === currentUser?.id && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3 animate-pulse">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-[10px] font-bold text-orange-500 leading-tight uppercase tracking-widest">
                   Cuidado: Você está tentando arquivar seu próprio usuário admin.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button variant="destructive" onClick={confirmArchive} className="rounded-xl font-black uppercase tracking-widest text-[10px]" disabled={!adminPassword || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Confirmar Arquivamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Restauração */}
      <Dialog open={isRestoreModalOpen} onOpenChange={setIsRestoreModalOpen}>
        <DialogContent className="rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary">Restaurar Conta</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Você está devolvendo o acesso à plataforma para <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
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
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} type="button">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsRestoreModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button onClick={confirmRestore} className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90" disabled={!adminPassword || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Confirmar Restauração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Arquivamento em Massa */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="rounded-[32px] border-border/40 bg-background/95 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-rose-500">Arquivar em Massa</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Você está prestes a arquivar <strong>{selectedIds.length} usuários</strong>. O acesso será removido, mas os dados preservados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Sua Senha de Administrador</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha para confirmar"
                  className="rounded-xl border-border/40 bg-rose-500/5 focus:ring-rose-500/20 pr-10"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} type="button">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button 
                variant="destructive" 
                onClick={confirmBulkArchive} 
                className="rounded-xl font-black uppercase tracking-widest text-[10px]"
                disabled={!adminPassword || isSubmitting || selectedIds.includes(currentUser?.id || "")}
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Confirmar Arquivamento em Massa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
