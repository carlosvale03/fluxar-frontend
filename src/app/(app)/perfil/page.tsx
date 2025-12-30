"use client"

import { useAuth } from "@/hooks/use-auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Camera, Edit2 } from "lucide-react"
import { useTheme } from "next-themes"

// Perfil Form Schema
const profileSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().optional().or(z.literal('')),
  phone_number: z.string().optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  avatar_url: z.string().optional().or(z.literal('')),
  // Preferences
  currency: z.string().optional(),
  language: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications_email: z.boolean().optional(),
  notifications_push: z.boolean().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

// Formatters
const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1')
}

const formatPlanName = (plan?: string) => {
    switch(plan) {
        case 'common': return 'Plano Gratuito'
        case 'premium': return 'Premium'
        case 'premium_plus': return 'Premium Plus'
        default: return 'Plano Gratuito'
    }
}

// Password Form Schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter 6+ chars"),
  confirmPassword: z.string().min(1, "Confirmação obrigatória"),
}).refine(data => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Senhas não conferem",
})
type PasswordForm = z.infer<typeof passwordSchema>

import { cn, getAbsoluteUrl } from "@/lib/utils"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { setTheme, theme: currentTheme } = useTheme()
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  
  // State for avatar preview
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // Profile Form
  const { 
    register: registerProfile, 
    handleSubmit: handleProfileSubmit, 
    formState: { errors: profileErrors }, 
    reset: resetProfile, 
    watch, 
    setValue,
    getValues
} = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      name: "",
      cpf: "",
      phone_number: "",
      date_of_birth: "",
      avatar_url: "",
      currency: "BRL",
      language: "pt-BR",
      theme: "system",
      notifications_email: true,
      notifications_push: false
    }
  })

  // Sync theme from next-themes to form when it changes externally (e.g. by header toggle)
  // REMOVED: potentially causes conflicts. Let the form drive the theme on this page.
  // If we really want it, we need to ensure it doesn't fire when the form itself triggered the change.
  // For now, simplicity is better stability.


  // Update form default value when user data loads
  // We use a ref to track the last user data we synced with to prevent 
  // form resets when other dependencies (like theme or reset function identity) change.
  const userJson = JSON.stringify(user)
  const prevUserJsonRef = useState(userJson) // actually, we want useRef but useState with logic is also fine. Let's use useRef properly. 
  // Wait, I can't import useRef in the middle. I need to make sure I have it.
  // ProfilePage already imports useState, useEffect. I need useRef.
  // I'll stick to a simpler pattern: trust the dependency array but REMOVE setTheme/resetProfile if they are the culprits.
  // Actually, the Ref pattern is safest.
  
  // Checking imports... lines 14 says: import { useState, useEffect } from "react". Need to add useRef.
  // I will assume I can add it or I'll just use a state to hold initialization status? No.
  
  // Let's rely on the fact that if I remove 'setTheme' and 'resetProfile' from the dependency array, it should stabilize.
  // But linter might complain. 
  // Best approach: Compare inside the effect.
  
  const [lastSyncedUserJson, setLastSyncedUserJson] = useState("")

  useEffect(() => {
    if (user && userJson !== lastSyncedUserJson) {
        resetProfile({ 
          name: user.name,
          cpf: user.cpf || "",
          phone_number: user.phone_number || "",
          date_of_birth: user.date_of_birth || "",
          avatar_url: user.avatar_url || "",
          currency: user.preferences?.currency || "BRL",
          language: user.preferences?.language || "pt-BR",
          theme: user.preferences?.theme || "system",
          notifications_email: user.preferences?.notifications?.email ?? true,
          notifications_push: user.preferences?.notifications?.push ?? false,
        })
        setAvatarPreview(getAbsoluteUrl(user.avatar_url))
        
        // Ensure global theme matches user preference on initial load
        if (user.preferences?.theme) {
             if (currentTheme !== user.preferences.theme) {
                 setTheme(user.preferences.theme)
             }
        }
        setLastSyncedUserJson(userJson)
    }
    // We explicitly exclude resetProfile and others to avoid re-running on everything. 
    // We successfully depend on userJson and our internal state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userJson, lastSyncedUserJson])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
          setAvatarFile(file)
          const objectUrl = URL.createObjectURL(file)
          setAvatarPreview(objectUrl)
      }
  }

  const onProfileSubmit = async (data: ProfileForm) => {
     try {
         setIsProfileLoading(true)
         
         // 1. Upload Avatar if changed
         if (avatarFile) {
             const formData = new FormData()
             formData.append('file', avatarFile)
             
             try {
                // Endpoint POST /users/me/avatar/ (Trailing slash for Django)
                const uploadRes = await api.post("/users/me/avatar/", formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                
                // Update avatar_url in payload
                if (uploadRes.data?.avatar_url) {
                    data.avatar_url = uploadRes.data.avatar_url
                    // Update preview immediately with clean URL
                    setAvatarPreview(getAbsoluteUrl(uploadRes.data.avatar_url))
                }
             } catch (uploadError) {
                 console.error("Avatar upload failed", uploadError)
                 toast.error("Erro ao enviar imagem. Verifique o console.")
                 setIsProfileLoading(false)
                 return 
             }
         }

         // 2. Update Profile Data
         const payload = {
            ...data,
            cpf: data.cpf || null,
            phone_number: data.phone_number || null,
            date_of_birth: data.date_of_birth || null,
            // Ensure we send valid URL or null
            avatar_url: data.avatar_url || null,
            preferences: {
                currency: data.currency,
                language: data.language,
                theme: data.theme,
                notifications: {
                    email: data.notifications_email,
                    push: data.notifications_push
                }
            }
         }

         await api.put("/users/me/", payload)
         await refreshUser()
         toast.success("Perfil atualizado com sucesso!")
         setAvatarDialogOpen(false)
     } catch (error: any) {
         console.error("Profile update error:", error.response?.data)
         const msg = error.response?.data?.detail 
            ? error.response.data.detail 
            : "Erro ao atualizar perfil."
         toast.error(msg)
     } finally {
         setIsProfileLoading(false)
     }
  }

  // Password Form
  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, reset: resetPassword } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema)
  })

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
        setIsPasswordLoading(true)
        await api.put("/users/me/password/", {
            current_password: data.currentPassword,
            new_password: data.newPassword
        })
        resetPassword()
        toast.success("Senha alterada com sucesso!")
    } catch (error: any) {
        const msg = error.response?.data?.current_password 
             ? "Senha atual incorreta." 
             : "Erro ao alterar senha."
        toast.error(msg)
    } finally {
        setIsPasswordLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl space-y-10 mb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
         <div className="group relative">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-2 ring-muted cursor-pointer transition-all hover:opacity-90">
                <AvatarImage src={avatarPreview || ""} className="object-cover" />
                <AvatarFallback className="text-4xl bg-muted text-foreground font-bold">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
            </Avatar>
            <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                <DialogTrigger asChild>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="text-white h-8 w-8" />
                    </div>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterar Foto de Perfil</DialogTitle>
                        <DialogDescription>
                            Selecione uma imagem do seu dispositivo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                             <Input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileChange}
                             />
                        </div>
                        <div className="flex justify-center">
                             <Avatar className="h-24 w-24 border-2 border-border">
                                <AvatarImage src={avatarPreview || ""} className="object-cover" />
                                <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleProfileSubmit(onProfileSubmit)} loading={isProfileLoading}>
                            Salvar Avatar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
         </div>
         
         <div className="flex-1 space-y-2 text-center md:text-left">
             <h1 className="text-3xl font-bold tracking-tight">{user?.name}</h1>
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-muted-foreground">
                 <span className="text-foreground">{user?.email}</span>
                 {user?.emailVerified && (
                     <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-500/20">Verificado</Badge>
                 )}
                 <Badge variant="default" className="text-xs tracking-wider font-medium">
                     {formatPlanName(user?.plan)}
                 </Badge>
             </div>
             <p className="text-sm text-muted-foreground max-w-lg">
                Gerencie suas informações pessoais e configurações de segurança da conta.
             </p>
         </div>
      </div>

      <Separator />

      <div className="grid gap-8 lg:grid-cols-3">
         
         {/* Main Column - Personal Info */}
         <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-sm bg-card/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                             <CardTitle className="text-xl">Informações Pessoais</CardTitle>
                             <CardDescription>Atualize seus dados cadastrais.</CardDescription>
                        </div>
                        <Edit2 className="h-5 w-5 text-muted-foreground opacity-50" />
                    </div>
                </CardHeader>
                <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
                    <CardContent className="space-y-6">
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nome Completo</label>
                            <Input {...registerProfile("name")} />
                            {profileErrors.name && <span className="text-xs text-red-500">{profileErrors.name.message}</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="space-y-2">
                                <label className="text-sm font-medium">CPF</label>
                                <Input 
                                    {...registerProfile("cpf")} 
                                    placeholder="000.000.000-00" 
                                    onChange={(e) => setValue("cpf", formatCPF(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Telefone</label>
                                <Input 
                                    {...registerProfile("phone_number")} 
                                    placeholder="(00) 00000-0000" 
                                    onChange={(e) => setValue("phone_number", formatPhone(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nascimento</label>
                                <Input type="date" {...registerProfile("date_of_birth")} />
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-4">
                            <h3 className="text-sm font-medium mb-4">Preferências do Sistema</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Moeda Padrão</label>
                                    <Select 
                                        onValueChange={(val) => setValue("currency", val)} 
                                        value={watch("currency") || "BRL"}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BRL">Real Brasileiro (BRL)</SelectItem>
                                            <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                                            <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Idioma</label>
                                    <Select 
                                        disabled
                                        onValueChange={(val) => setValue("language", val)} 
                                        value={watch("language") || "pt-BR"}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                                            <SelectItem value="en-US">English (US)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">Indisponível no momento.</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Tema</label>
                                    <Select 
                                        onValueChange={(val: any) => {
                                            setValue("theme", val, { shouldDirty: true })
                                            setTheme(val)
                                        }} 
                                        value={watch("theme")}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Claro</SelectItem>
                                            <SelectItem value="dark">Escuro</SelectItem>
                                            <SelectItem value="system">Sistema</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end pt-4 border-t bg-muted/20">
                        <Button type="submit" loading={isProfileLoading} disabled={isProfileLoading}>
                            Salvar Alterações
                        </Button>
                    </CardFooter>
                </form>
            </Card>
         </div>

         {/* Side Column - Security */}
         <div className="space-y-8">
            <Card className="border-none shadow-sm bg-card/50">
                <CardHeader>
                    <CardTitle className="text-xl">Segurança</CardTitle>
                    <CardDescription>Alterar sua senha.</CardDescription>
                </CardHeader>
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Senha Atual</label>
                            <Input type="password" {...registerPassword("currentPassword")} />
                             {passwordErrors.currentPassword && <span className="text-xs text-red-500">{passwordErrors.currentPassword.message}</span>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nova Senha</label>
                            <Input type="password" {...registerPassword("newPassword")} />
                            {passwordErrors.newPassword && <span className="text-xs text-red-500">{passwordErrors.newPassword.message}</span>}
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Confirmar</label>
                             <Input type="password" {...registerPassword("confirmPassword")} />
                             {passwordErrors.confirmPassword && <span className="text-xs text-red-500">{passwordErrors.confirmPassword.message}</span>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" variant="secondary" className="w-full" loading={isPasswordLoading} disabled={isPasswordLoading}>
                            Atualizar Senha
                        </Button>
                    </CardFooter>
                </form>
            </Card>
         </div>
      </div>
    </div>
  )
}
