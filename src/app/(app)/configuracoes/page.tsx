"use client"

import { useAuth } from "@/hooks/use-auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Lock, Globe, Bell } from "lucide-react"

// --- Settings Form Schema ---
const settingsSchema = z.object({
  currency: z.string().optional(),
  language: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications_email: z.boolean().optional(),
  notifications_push: z.boolean().optional(),
})
type SettingsForm = z.infer<typeof settingsSchema>

// --- Password Form Schema ---
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Sua senha atual é obrigatória"),
  newPassword: z.string()
    .min(1, "A nova senha é obrigatória")
    .min(8, "A nova senha deve ter pelo menos 8 caracteres")
    .refine((val) => !/^\d+$/.test(val), {
      message: "A senha não pode ser puramente numérica",
    }),
  confirmPassword: z.string().min(1, "A confirmação de senha é obrigatória"),
}).refine(data => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "As senhas não conferem",
})
type PasswordForm = z.infer<typeof passwordSchema>

import { cn } from "@/lib/utils"
import { PasswordInput } from "@/components/ui/password-input"

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { setTheme, theme: currentTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("general")
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  // --- Settings Form Hook ---
  const { 
    handleSubmit: handleSettingsSubmit, 
    reset: resetSettings, 
    watch, 
    setValue,
    getValues
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { 
      currency: "BRL",
      language: "pt-BR",
      theme: "system",
      notifications_email: true,
      notifications_push: false
    }
  })

  const [lastSyncedUserJson, setLastSyncedUserJson] = useState("")

  // Sync with user data
  useEffect(() => {
    const userJson = JSON.stringify(user)
    if (user && userJson !== lastSyncedUserJson) {
        resetSettings({ 
          currency: user.preferences?.currency || "BRL",
          language: user.preferences?.language || "pt-BR",
          theme: user.preferences?.theme || "system",
          notifications_email: user.preferences?.notifications?.email ?? true,
          notifications_push: user.preferences?.notifications?.push ?? false,
        })
        
        if (user.preferences?.theme && currentTheme !== user.preferences.theme) {
             setTheme(user.preferences.theme)
        }
        setLastSyncedUserJson(userJson)
    }
  }, [user, lastSyncedUserJson, resetSettings, setTheme, currentTheme])

  const onSettingsSubmit = async (data: SettingsForm) => {
     try {
         setIsSettingsLoading(true)
         
         const payload = {
            ...user, // Preserve other user data
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
         toast.success("Configurações atualizadas com sucesso!")
     } catch (error: any) {
         console.error("Settings update error:", error)
         toast.error("Erro ao atualizar configurações.")
     } finally {
         setIsSettingsLoading(false)
     }
  }

  // --- Password Form Hook ---
  const { 
    register: registerPassword, 
    handleSubmit: handlePasswordSubmit, 
    formState: { errors: passwordErrors }, 
    reset: resetPassword 
  } = useForm<PasswordForm>({
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
             : "Erro ao alterar senha. Verifique os requisitos."
        toast.error(msg)
    } finally {
        setIsPasswordLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl space-y-8 mb-20 animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Configurações</h1>
            <p className="text-muted-foreground mt-1">
                Gerencie suas preferências de uso e segurança da conta.
            </p>
          </div>
          
          <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/40">
            <TabsTrigger value="general" className="rounded-xl font-bold px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Geral</TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl font-bold px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Segurança</TabsTrigger>
          </TabsList>
        </div>

      <Separator className="bg-border/40" />

      {/* --- GENERAL SETTINGS TAB --- */}
      <TabsContent value="general" className="mt-8 animate-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[32px] border-border/60 shadow-sm bg-card overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                              <Globe className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                              <CardTitle className="text-xl font-bold tracking-tight">Preferências Locais</CardTitle>
                              <CardDescription>Moeda e Idioma do sistema.</CardDescription>
                          </div>
                      </div>
                  </CardHeader>
                  <form onSubmit={handleSettingsSubmit(onSettingsSubmit)}>
                      <CardContent className="px-8 py-6 space-y-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Moeda Padrão</label>
                              <Select 
                                  onValueChange={(val) => setValue("currency", val)} 
                                  value={watch("currency") || "BRL"}
                              >
                                  <SelectTrigger className="rounded-2xl h-11 focus:ring-primary/20 transition-all"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                  <SelectContent className="rounded-2xl">
                                      <SelectItem value="BRL">Real Brasileiro (BRL)</SelectItem>
                                      <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          
                          <div className="space-y-2 opacity-60">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Idioma</label>
                              <Select disabled value="pt-BR">
                                  <SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Português (Brasil)" /></SelectTrigger>
                                  <SelectContent className="rounded-2xl">
                                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                                  </SelectContent>
                              </Select>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Multi-idioma disponível em breve</p>
                          </div>
                      </CardContent>
                      <CardFooter className="px-8 pb-8 pt-0">
                          <Button type="submit" loading={isSettingsLoading} disabled={isSettingsLoading} className="w-full rounded-full h-11 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                              Salvar Alterações
                          </Button>
                      </CardFooter>
                  </form>
              </Card>

              <Card className="rounded-[32px] border-border/60 shadow-sm bg-card overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                              <Settings className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                              <CardTitle className="text-xl font-bold tracking-tight">Experiência Visual</CardTitle>
                              <CardDescription>Tema e Aparência.</CardDescription>
                          </div>
                      </div>
                  </CardHeader>
                  <CardContent className="px-8 py-6 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Tema do Sistema</label>
                          <div className="grid grid-cols-3 gap-3">
                            {['light', 'dark', 'system'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setValue("theme", t as any, { shouldDirty: true })
                                  setTheme(t)
                                  // Forçamos o salvamento imediato com o valor correto
                                  onSettingsSubmit({ ...getValues(), theme: t as any })
                                }}
                                className={cn(
                                  "flex flex-col items-center justify-center gap-2 p-2.5 rounded-[22px] border-2 transition-all duration-300",
                                  watch("theme") === t 
                                    ? "bg-primary/5 border-primary shadow-sm" 
                                    : "bg-muted/30 border-transparent hover:bg-muted/50"
                                )}
                              >
                                <div className={cn(
                                  "w-full aspect-video rounded-[14px] border border-black/5 dark:border-white/10 shadow-inner",
                                  t === 'light' ? "bg-white" : t === 'dark' ? "bg-zinc-900" : "bg-gradient-to-r from-white to-zinc-900"
                                )} />
                                <span className="text-[10px] font-black uppercase tracking-wider mt-1">
                                  {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}
                                </span>
                              </button>
                            ))}
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>
      </TabsContent>

      {/* --- SECURITY SETTINGS TAB --- */}
      <TabsContent value="security" className="mt-8 animate-in slide-in-from-bottom-2 duration-500">
          <Card className="rounded-[32px] border-border/60 shadow-sm bg-card overflow-hidden max-w-2xl">
              <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-destructive/5 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                          <Lock className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                          <CardTitle className="text-xl font-bold tracking-tight">Segurança da Conta</CardTitle>
                          <CardDescription>Alteração de senha e autenticação.</CardDescription>
                      </div>
                  </div>
              </CardHeader>
              <Separator className="bg-border/40" />
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                  <CardContent className="p-8 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Senha Atual</label>
                          <PasswordInput 
                            {...registerPassword("currentPassword")} 
                            placeholder="Sua senha anterior"
                            className={cn(
                              "rounded-2xl h-11 transition-all duration-300",
                              passwordErrors.currentPassword ? "border-destructive focus-visible:ring-destructive/20" : "focus-visible:ring-primary/20"
                            )}
                          />
                          {passwordErrors.currentPassword && <p className="text-[10px] font-bold text-destructive uppercase ml-1">{passwordErrors.currentPassword.message}</p>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Nova Senha</label>
                            <PasswordInput 
                              {...registerPassword("newPassword")} 
                              placeholder="Mínimo 8 caracteres"
                              className={cn(
                                "rounded-2xl h-11 transition-all duration-300",
                                passwordErrors.newPassword ? "border-destructive focus-visible:ring-destructive/20" : "focus-visible:ring-primary/20"
                              )}
                            />
                            {passwordErrors.newPassword && <p className="text-[10px] font-bold text-destructive uppercase ml-1 leading-tight">{passwordErrors.newPassword.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Confirmar Nova Senha</label>
                            <PasswordInput 
                              {...registerPassword("confirmPassword")} 
                              placeholder="Repita a nova senha"
                              className={cn(
                                "rounded-2xl h-11 transition-all duration-300",
                                passwordErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive/20" : "focus-visible:ring-primary/20"
                              )}
                            />
                            {passwordErrors.confirmPassword && <p className="text-[10px] font-bold text-destructive uppercase ml-1">{passwordErrors.confirmPassword.message}</p>}
                        </div>
                      </div>
                  </CardContent>
                  <CardFooter className="p-8 pt-0 flex justify-end">
                      <Button type="submit" variant="destructive" loading={isPasswordLoading} disabled={isPasswordLoading} className="rounded-full px-8 h-11 font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                          Atualizar Senha
                      </Button>
                  </CardFooter>
              </form>
          </Card>
      </TabsContent>
      </Tabs>
    </div>
  )
}
