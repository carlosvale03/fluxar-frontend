"use client"

import { useState, useEffect } from "react"
import { nomeDoPlano } from "@/hooks/use-plan"
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
import { tratarErro } from "@/lib/erros"
import { CampoDaSenhaDoAdmin, tratarErroDaAcao } from "@/app/(admin)/admin/_componentes/confirmacoes"
import type { Plano } from "@/types/planos"

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [erroAoCarregar, setErroAoCarregar] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
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
  // ADMIN-18: a recusa da senha aparece no campo
  const [erroSenha, setErroSenha] = useState("")
  const [newPlan, setNewPlan] = useState<string>("COMMON")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce para busca no servidor
  useEffect(() => {
    const timer = setTimeout(() => {
      // Só uma busca nova volta à primeira página; a abertura da tela não
      // desfaz a troca de página feita antes do fim da espera
      if (search === debouncedSearch) return
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setErroAoCarregar(false)
      const data = await getAdminUsers(
        page, 
        debouncedSearch, 
        viewArchived, 
        filterRole === "ALL" ? undefined : filterRole,
        filterPlan === "ALL" ? undefined : filterPlan
      )
      setUsers(data.results)
      setTotalCount(data.count)
      setTotalPages(data.total_pages)
    } catch (error) {
      // AD-042: o erro da lista passa pelo caminho único, com "Tentar de novo"
      setUsers([])
      setErroAoCarregar(true)
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar a lista de usuários.", tentarDeNovo: loadUsers })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [page, debouncedSearch, viewArchived, filterRole, filterPlan])

  // Cada confirmação começa com a senha vazia e sem erro
  const limparSenha = () => {
    setAdminPassword("")
    setErroSenha("")
  }

  const mudarSenha = (valor: string) => {
    setAdminPassword(valor)
    setErroSenha("")
  }

  const handleToggleRole = (user: User) => {
    setSelectedUser(user)
    setPendingRole(user.role === "ADMIN" ? "USER" : "ADMIN")
    limparSenha()
    setIsChangeRoleModalOpen(true)
  }

  // ADMIN-17: mudar o papel pede a senha
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
    } catch (error) {
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Não foi possível alterar o cargo. Tente de novo." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveUser = async (user: User) => {
    setSelectedUser(user)
    limparSenha()
    setIsDeleteModalOpen(true)
  }

  const handleRestoreUser = async (user: User) => {
    setSelectedUser(user)
    setIsRestoreModalOpen(true)
  }

  // ADMIN-17: arquivar pede a senha
  const confirmArchive = async () => {
    if (!selectedUser || !adminPassword) return

    try {
      setIsSubmitting(true)
      await deleteAdminUser(selectedUser.id, adminPassword)
      toast.success(`Usuário ${selectedUser.name} arquivado.`)
      setIsDeleteModalOpen(false)
      loadUsers()
    } catch (error) {
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Não foi possível arquivar o usuário. Tente de novo." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reativar não pede a senha: ela vale só para desativar (ADMIN-17)
  const confirmRestore = async () => {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      await updateAdminUser(selectedUser.id, { is_active: true })
      toast.success(`Usuário ${selectedUser.name} restaurado.`)
      setIsRestoreModalOpen(false)
      loadUsers()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível restaurar o usuário. Tente de novo." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePlan = (user: User) => {
    setSelectedUser(user)
    setNewPlan(user.plan)
    setIsChangePlanModalOpen(true)
  }

  // ADMIN-19: mudar o plano não pede a senha
  const confirmChangePlan = async () => {
    if (!selectedUser || !newPlan) return

    try {
      setIsSubmitting(true)
      await updateAdminUser(selectedUser.id, { plan: newPlan as Plano })
      toast.success(`Plano de ${selectedUser.name} alterado para ${newPlan}.`)
      setIsChangePlanModalOpen(false)
      loadUsers()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível alterar o plano. Tente de novo." })
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
    limparSenha()
    setIsBulkDeleteModalOpen(true)
  }

  const confirmBulkArchive = async () => {
    if (selectedIds.length === 0 || !adminPassword) return

    try {
      setIsSubmitting(true)
      await bulkDeleteAdminUsers(selectedIds, adminPassword)
      toast.success(`${selectedIds.length} usuários arquivados.`)
      setIsBulkDeleteModalOpen(false)
      setSelectedIds([])
      setIsSelectionMode(false)
      loadUsers()
    } catch (error) {
      tratarErroDaAcao(error, { aoErrarSenha: setErroSenha, mensagemPadrao: "Não foi possível arquivar os usuários. Tente de novo." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="label text-muted-foreground">
          Carregando usuários
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:space-y-8 sm:p-8">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="flex flex-col">
            <h1 className="display-l">
              Gestão de Usuários
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading ? "Carregando" : `${totalCount} usuários cadastrados`}
            </p>
          </div>
          
          <div className="flex w-fit gap-1 rounded-md border border-border bg-elevated p-1">
            <Button 
              variant={!viewArchived ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("rounded-sm px-4", !viewArchived && "bg-card text-foreground")}
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
              className={cn("rounded-sm px-4", viewArchived && "bg-card text-foreground")}
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input 
              type="search"
              id="fluxar-admin-search-no-autofill"
              name="fluxar-search-query"
              placeholder="Buscar por nome ou e-mail..." 
              className="w-full pl-10"
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
              <SelectTrigger aria-label="Filtrar por cargo" className="w-[130px] sm:w-[150px]">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Cargos</SelectItem>
                <SelectItem value="ADMIN">Administradores</SelectItem>
                <SelectItem value="USER">Usuários</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPlan} onValueChange={(val) => {
              setFilterPlan(val)
              setPage(1)
            }}>
              <SelectTrigger aria-label="Filtrar por plano" className="w-[130px] sm:w-[150px]">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Planos</SelectItem>
                <SelectItem value="COMMON">{nomeDoPlano("COMMON")}</SelectItem>
                <SelectItem value="PREMIUM">{nomeDoPlano("PREMIUM")}</SelectItem>
                <SelectItem value="PREMIUM_PLUS">{nomeDoPlano("PREMIUM_PLUS")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant={isSelectionMode ? "secondary" : "outline"}
            className={cn(
              "ml-auto shrink-0 sm:ml-0",
              isSelectionMode && "border border-gold-line text-foreground"
            )}
            onClick={() => {
              setIsSelectionMode(!isSelectionMode)
              if (isSelectionMode) setSelectedIds([])
            }}
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            <span className="inline-flex">{isSelectionMode ? "Concluir" : "Seleção"}</span>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-none border-y border-border bg-card sm:rounded-lg sm:border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isSelectionMode && (
                <TableHead className="w-12 py-5 pl-4">
                  <Checkbox 
                    checked={users.length > 0 && selectedIds.length === users.length}
                    onCheckedChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </TableHead>
              )}
              <TableHead className="label text-muted-foreground">Usuário</TableHead>
              <TableHead className="label text-muted-foreground">Plano</TableHead>
              <TableHead className="label text-muted-foreground">Cargo</TableHead>
              <TableHead className="label hidden text-muted-foreground sm:table-cell">Cadastro</TableHead>
              <TableHead className="label w-[80px] text-right text-muted-foreground sm:w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                {isSelectionMode && (
                  <TableCell className="w-12">
                     <Checkbox 
                       checked={selectedIds.includes(user.id)}
                       onCheckedChange={() => toggleSelect(user.id)}
                       className="cursor-pointer"
                     />
                  </TableCell>
                )}
                <TableCell className="py-2.5 sm:py-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className="h-8 w-8 border border-border-strong sm:h-10 sm:w-10">
                      <AvatarImage src={getAbsoluteUrl(user.avatar_url) || ""} />
                      <AvatarFallback className="bg-elevated font-mono">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "px-3",
                    user.plan === "PREMIUM_PLUS" ? "text-gold-line" :
                    user.plan === "PREMIUM" ? "text-foreground" :
                    "text-fg-secondary"
                  )}>
                    {user.plan.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.role === "ADMIN" ? (
                      <Badge variant="info">
                        <Shield className="h-3 w-3" aria-hidden="true" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <UserIcon className="h-3 w-3" aria-hidden="true" /> User
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/usuarios/${user.id}`} aria-label={`Ver detalhes de ${user.name}`} title="Ver detalhes">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Ações de ${user.name}`}>
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="label text-muted-foreground">Ações Admin</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="flex cursor-pointer items-center gap-2" onClick={() => handleToggleRole(user)}>
                        <Shield className="h-4 w-4" />
                        {user.role === "ADMIN" ? "Tirar Admin" : "Tornar Admin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex cursor-pointer items-center gap-2" onClick={() => handleChangePlan(user)}>
                        <Edit2 className="h-4 w-4" /> Alterar Plano
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          viewArchived ? "text-gold-line focus:text-gold-line" : "text-outflow focus:text-outflow"
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
        
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border p-4 sm:flex-row">
          <div className="w-full text-center font-mono text-xs text-muted-foreground sm:w-auto sm:text-left">
             {users.length} de {totalCount} usuários
          </div>
          <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-3 w-3" aria-hidden="true" /> Ant.
            </Button>
            <div className="border-x border-border px-4 font-mono text-xs">
              {page}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => p + 1)}
              // CONTRATO-02: a última página vem da API (20 itens por página)
              disabled={page >= totalPages || isLoading}
              className="flex-1 sm:flex-none"
            >
              Próx. <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {users.length === 0 && !isLoading && (
          <div className="py-20 text-center space-y-4">
             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border-strong text-muted-foreground">
                <UserIcon className="h-8 w-8" aria-hidden="true" />
             </div>
             {erroAoCarregar ? (
               <>
                 <p className="text-sm text-muted-foreground">Não foi possível carregar a lista</p>
                 <Button variant="outline" onClick={loadUsers}>
                   Tentar de novo
                 </Button>
               </>
             ) : (
               <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
             )}
          </div>
        )}
      </div>

      {/* Floating Action Bar para Seleção em Massa */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-sticky px-4 sm:bottom-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-0">
           <div className="flex flex-col items-center gap-3 rounded-lg border border-border-strong bg-elevated px-4 py-2.5 sm:flex-row sm:gap-6 sm:px-6 sm:py-3">
              <div className="flex items-center gap-2">
                 <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold">
                    <span className="font-mono text-xs text-gold-ink">{selectedIds.length}</span>
                 </div>
                 <span className="label text-muted-foreground">Selecionados</span>
              </div>
              <div className="hidden h-6 w-px bg-border sm:block" />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-outflow hover:bg-outflow/10 hover:text-outflow sm:flex-none"
                    onClick={handleBulkArchive}
                 >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Excluir</span>
                 </Button>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 sm:flex-none"
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

      {/* Modal de Alteração de Plano (ADMIN-19: sem senha) */}
      <Dialog open={isChangePlanModalOpen} onOpenChange={setIsChangePlanModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="display-m">Alterar Plano</DialogTitle>
            <DialogDescription>
              Selecione o novo nível de acesso para <strong>{selectedUser?.name}</strong>.
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
            <Button variant="ghost" onClick={() => setIsChangePlanModalOpen(false)} >Cancelar</Button>
            <Button
                onClick={confirmChangePlan}
                
                disabled={isSubmitting || newPlan === selectedUser?.plan}
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Alteração de Cargo (ADMIN-17: com senha) */}
      <Dialog open={isChangeRoleModalOpen} onOpenChange={setIsChangeRoleModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="display-m">Alterar Cargo</DialogTitle>
            <DialogDescription>
              Você está alterando o cargo de <strong>{selectedUser?.name}</strong> para <strong>{pendingRole}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />

            {selectedUser?.id === currentUser?.id && pendingRole !== 'ADMIN' && (
              <div className="flex gap-3 rounded-r-md border border-border border-l-[3px] border-l-warn bg-card p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                <p className="text-xs leading-tight text-foreground">
                   Cuidado: Você está prestes a remover seu próprio cargo de administrador.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsChangeRoleModalOpen(false)} >Cancelar</Button>
            <Button
                onClick={confirmChangeRole}
               
                disabled={!adminPassword || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Arquivamento Seguro (ADMIN-17: com senha) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="display-m">Arquivar Conta</DialogTitle>
            <DialogDescription>
              O usuário <strong>{selectedUser?.name}</strong> perderá o acesso, mas os dados serão preservados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />
            {selectedUser?.id === currentUser?.id && (
              <div className="flex gap-3 rounded-r-md border border-border border-l-[3px] border-l-warn bg-card p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                <p className="text-xs leading-tight text-foreground">
                   Cuidado: Você está tentando arquivar seu próprio usuário admin.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} >Cancelar</Button>
            <Button variant="destructive" onClick={confirmArchive} disabled={!adminPassword || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              Confirmar Arquivamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Restauração (reativar não pede a senha) */}
      <Dialog open={isRestoreModalOpen} onOpenChange={setIsRestoreModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="display-m">Restaurar Conta</DialogTitle>
            <DialogDescription>
              Você está devolvendo o acesso à plataforma para <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsRestoreModalOpen(false)} >Cancelar</Button>
            <Button onClick={confirmRestore}  disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              Confirmar Restauração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Arquivamento em Massa (ADMIN-17: com senha) */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="display-m">Arquivar em Massa</DialogTitle>
            <DialogDescription>
              Você está prestes a arquivar <strong>{selectedIds.length} usuários</strong>. O acesso será removido, mas os dados preservados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <CampoDaSenhaDoAdmin valor={adminPassword} onChange={mudarSenha} erro={erroSenha} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)} >Cancelar</Button>
            <Button
                variant="destructive"
                onClick={confirmBulkArchive}
                
                disabled={!adminPassword || isSubmitting || selectedIds.includes(currentUser?.id || "")}
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              Confirmar Arquivamento em Massa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
