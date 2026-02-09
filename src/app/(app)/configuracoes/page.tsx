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
  currentPassword: z.string().min(1, "Senha atual obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter 6+ chars"),
  confirmPassword: z.string().min(1, "Confirmação obrigatória"),
}).refine(data => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Senhas não conferem",
})
type PasswordForm = z.infer<typeof passwordSchema>

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
    setValue
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

  // Sync with user data
  useEffect(() => {
    if (user) {
        resetSettings({ 
          currency: user.preferences?.currency || "BRL",
          language: user.preferences?.language || "pt-BR",
          theme: user.preferences?.theme || "system",
          notifications_email: user.preferences?.notifications?.email ?? true,
          notifications_push: user.preferences?.notifications?.push ?? false,
        })
        
        // Ensure global theme matches user preference on initial load
        if (user.preferences?.theme && currentTheme !== user.preferences.theme) {
             setTheme(user.preferences.theme)
        }
    }
  }, [user, resetSettings, setTheme, currentTheme]) // Fixed dependency array

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
             : "Erro ao alterar senha."
        toast.error(msg)
    } finally {
        setIsPasswordLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl space-y-8 mb-20">
      
      <div>
        <h1 className="text-3xl font-black tracking-tighter">Configurações</h1>
        <p className="text-muted-foreground mt-2">
            Gerencie suas preferências de uso e segurança da conta.
        </p>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="general" className="font-bold">Geral</TabsTrigger>
          <TabsTrigger value="security" className="font-bold">Segurança</TabsTrigger>
        </TabsList>
        
        {/* --- GENERAL SETTINGS TAB --- */}
        <TabsContent value="general" className="mt-6 space-y-6">
            <Card className="border-none shadow-sm bg-card/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        <CardTitle>Preferências do Sistema</CardTitle>
                    </div>
                    <CardDescription>Personalize sua experiência no Fluxar.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSettingsSubmit(onSettingsSubmit)}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Globe className="h-4 w-4 opacity-50" /> Moeda Padrão
                                </label>
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
                                <label className="text-sm font-medium flex items-center gap-2">
                                    Idioma
                                </label>
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
                                <label className="text-sm font-medium flex items-center gap-2">
                                    Tema
                                </label>
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
                    </CardContent>
                    <CardFooter className="flex justify-end pt-4 border-t bg-muted/20">
                        <Button type="submit" loading={isSettingsLoading} disabled={isSettingsLoading} className="font-bold">
                            Salvar Preferências
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </TabsContent>

        {/* --- SECURITY SETTINGS TAB --- */}
        <TabsContent value="security" className="mt-6 space-y-6">
            <Card className="border-none shadow-sm bg-card/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        <CardTitle>Alterar Senha</CardTitle>
                    </div>
                    <CardDescription>Mantenha sua conta segura alterando sua senha periodicamente.</CardDescription>
                </CardHeader>
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                    <CardContent className="space-y-4 max-w-md">
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
                            <label className="text-sm font-medium">Confirmar Nova Senha</label>
                                <Input type="password" {...registerPassword("confirmPassword")} />
                                {passwordErrors.confirmPassword && <span className="text-xs text-red-500">{passwordErrors.confirmPassword.message}</span>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-4 border-t bg-muted/20">
                        <Button type="submit" variant="destructive" loading={isPasswordLoading} disabled={isPasswordLoading} className="font-bold">
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
