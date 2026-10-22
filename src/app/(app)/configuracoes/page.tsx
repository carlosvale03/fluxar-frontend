"use client"

import { useAuth } from "@/hooks/use-auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Lock, Globe, Bell } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { tratarErro } from "@/lib/erros"
import { ExcluirConta } from "@/components/privacidade/excluir-conta"
import { ConsentimentoDeMelhoria } from "@/components/privacidade/consentimento"

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
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: z.string()
    .min(1, "Informe a nova senha.")
    .min(8, "Use pelo menos 8 caracteres na senha.")
    .refine((val) => !/^\d+$/.test(val), {
      message: "A senha não pode ter só números.",
    }),
  confirmPassword: z.string().min(1, "Repita a nova senha para confirmar."),
}).refine(data => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "As senhas não conferem. Digite a mesma senha nos dois campos.",
})
type PasswordForm = z.infer<typeof passwordSchema>

import { cn } from "@/lib/utils"
import { PasswordInput } from "@/components/ui/password-input"

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("general")
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  // --- Settings Form Hook ---
  const { 
    handleSubmit: handleSettingsSubmit, 
    reset: resetSettings, 
    watch, 
    setValue,
    getValues,
    setError: setSettingsError,
    formState: { errors: settingsErrors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { 
      currency: "BRL",
      language: "pt-BR",
      theme: "dark",
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
          theme: user.preferences?.theme || "dark",
          notifications_email: user.preferences?.notifications?.email ?? true,
          notifications_push: user.preferences?.notifications?.push ?? false,
        })
        // CONTRATO-27: o tema do usuário é aplicado no auth-context, ao carregar
        setLastSyncedUserJson(userJson)
    }
  }, [user, lastSyncedUserJson, resetSettings])

  const onSettingsSubmit = async (data: SettingsForm) => {
     try {
         setIsSettingsLoading(true)
         
         // CONTRATO-26: só o objeto preferences, sem espalhar o usuário
         const payload = {
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

         await api.patch("/users/me/", payload)
         await refreshUser()
         toast.success("Configurações atualizadas.")
     } catch (error) {
         // CONTRATO-28 e CONTRATO-30: o erro de cada preferência vai para o campo
         tratarErro(error, {
             form: { setError: setSettingsError },
             campos: {
                 "preferences.currency": "currency",
                 "preferences.language": "language",
                 "preferences.theme": "theme",
                 "preferences.notifications.email": "notifications_email",
                 "preferences.notifications.push": "notifications_push",
             },
             mensagemPadrao: "Não foi possível salvar as configurações. Tente de novo.",
         })
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
        toast.success("Senha alterada.")
    } catch (error: any) {
        const msg = error.response?.data?.current_password 
             ? "A senha atual está incorreta. Confira e tente de novo."
             : "Não foi possível alterar a senha. Use pelo menos 8 caracteres, sem ser só números, e tente de novo."
        toast.error(msg)
    } finally {
        setIsPasswordLoading(false)
    }
  }


  const temas = [
    { valor: "light", rotulo: "Claro", amostra: "bg-neutral-0" },
    { valor: "dark", rotulo: "Escuro", amostra: "bg-neutral-900" },
    { valor: "system", rotulo: "Sistema", amostra: "bg-gradient-to-r from-neutral-0 to-neutral-900" },
  ] as const

  return (
    <div className="container mx-auto mb-20 max-w-5xl px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <CabecalhoDePagina
          titulo="Configurações"
          apoio="Preferências, segurança e privacidade da conta"
          acoes={
            <TabsList className="h-auto">
              <TabsTrigger value="general" className="px-4">Geral</TabsTrigger>
              <TabsTrigger value="security" className="px-4">Segurança</TabsTrigger>
              <TabsTrigger value="privacy" className="px-4">Privacidade</TabsTrigger>
            </TabsList>
          }
        />

      {/* --- GERAL --- */}
      <TabsContent value="general" className="mt-0">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                  <CardHeader className="p-5 pb-4">
                      <div className="flex items-center gap-3">
                          <Globe className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                          <div>
                              <CardTitle role="heading" aria-level={2}>Preferências locais</CardTitle>
                              <CardDescription>Moeda e idioma do sistema.</CardDescription>
                          </div>
                      </div>
                  </CardHeader>
                  <form onSubmit={handleSettingsSubmit(onSettingsSubmit)}>
                      <CardContent className="space-y-5 px-5 pb-5">
                          <div className="space-y-2">
                              <Label id="rotulo-moeda">Moeda padrão</Label>
                              <Select
                                  onValueChange={(val) => setValue("currency", val)}
                                  value={watch("currency") || "BRL"}
                              >
                                  <SelectTrigger aria-labelledby="rotulo-moeda"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="BRL">Real Brasileiro (BRL)</SelectItem>
                                      <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                  </SelectContent>
                              </Select>
                              {settingsErrors.currency && <p role="alert" className="text-xs text-outflow">{settingsErrors.currency.message}</p>}
                          </div>

                          <div className="space-y-2">
                              <Label id="rotulo-idioma">Idioma</Label>
                              <Select disabled value="pt-BR">
                                  <SelectTrigger aria-labelledby="rotulo-idioma"><SelectValue placeholder="Português (Brasil)" /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                                  </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">Outros idiomas em breve.</p>
                          </div>

                          <fieldset className="space-y-3">
                              <legend className="label mb-3 flex items-center gap-2 text-muted-foreground">
                                  <Bell className="h-3.5 w-3.5" aria-hidden="true" /> Notificações
                              </legend>
                              {([
                                  ["notifications_email", "Notificações por e-mail"],
                                  ["notifications_push", "Notificações no navegador"],
                              ] as const).map(([campo, rotulo]) => (
                                  <div key={campo} className="space-y-1">
                                      <div className="flex h-11 items-center justify-between rounded-md border border-border px-4">
                                          <label htmlFor={campo} className="text-sm font-medium">{rotulo}</label>
                                          <Switch
                                              id={campo}
                                              checked={!!watch(campo)}
                                              onCheckedChange={(ligado) => setValue(campo, ligado, { shouldDirty: true })}
                                          />
                                      </div>
                                      {settingsErrors[campo] && <p role="alert" className="text-xs text-outflow">{settingsErrors[campo]?.message}</p>}
                                  </div>
                              ))}
                          </fieldset>
                      </CardContent>
                      <CardFooter className="flex justify-end px-5 pb-5 pt-0">
                          <Button type="submit" loading={isSettingsLoading} disabled={isSettingsLoading}>
                              Salvar alterações
                          </Button>
                      </CardFooter>
                  </form>
              </Card>

              <Card className="h-fit">
                  <CardHeader className="p-5 pb-4">
                      <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                          <div>
                              <CardTitle role="heading" aria-level={2}>Aparência</CardTitle>
                              <CardDescription>Tema da interface. Muda na hora.</CardDescription>
                          </div>
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-2 px-5 pb-5">
                      <p id="rotulo-tema" className="label text-muted-foreground">Tema</p>
                      <div role="group" aria-labelledby="rotulo-tema" className="grid grid-cols-3 gap-3">
                        {temas.map((t) => {
                          const ativo = watch("theme") === t.valor
                          return (
                            <button
                              key={t.valor}
                              type="button"
                              aria-pressed={ativo}
                              onClick={() => {
                                setValue("theme", t.valor, { shouldDirty: true })
                                setTheme(t.valor)
                                // Forçamos o salvamento imediato com o valor correto
                                onSettingsSubmit({ ...getValues(), theme: t.valor })
                              }}
                              className={cn(
                                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-2.5 transition-colors duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                ativo
                                  ? "border-gold-line bg-elevated"
                                  : "border-border hover:bg-elevated"
                              )}
                            >
                              <span aria-hidden="true" className={cn("aspect-video w-full rounded-sm border border-border-strong", t.amostra)} />
                              <span className={cn("text-sm", ativo ? "font-semibold text-foreground" : "text-fg-secondary")}>
                                {t.rotulo}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      {settingsErrors.theme && <p role="alert" className="text-xs text-outflow">{settingsErrors.theme.message}</p>}
                  </CardContent>
              </Card>
          </div>
      </TabsContent>

      {/* --- SEGURANÇA --- */}
      <TabsContent value="security" className="mt-0">
          <Card className="max-w-2xl">
              <CardHeader className="p-5 pb-4">
                  <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <div>
                          <CardTitle role="heading" aria-level={2}>Segurança da conta</CardTitle>
                          <CardDescription>Alteração de senha.</CardDescription>
                      </div>
                  </div>
              </CardHeader>
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                  <CardContent className="space-y-5 border-t border-border p-5">
                      <div className="space-y-2">
                          <Label htmlFor="senha-atual">Senha atual</Label>
                          <PasswordInput
                            id="senha-atual"
                            autoComplete="current-password"
                            {...registerPassword("currentPassword")}
                                                        aria-invalid={passwordErrors.currentPassword ? true : undefined}
                            aria-describedby={passwordErrors.currentPassword ? "senha-atual-erro" : undefined}
                            className={cn(passwordErrors.currentPassword && "border-outflow")}
                          />
                          {passwordErrors.currentPassword && <p id="senha-atual-erro" role="alert" className="text-xs text-outflow">{passwordErrors.currentPassword.message}</p>}
                      </div>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="nova-senha">Nova senha</Label>
                            <PasswordInput
                              id="nova-senha"
                              autoComplete="new-password"
                              {...registerPassword("newPassword")}
                              placeholder="Mínimo 8 caracteres"
                              aria-invalid={passwordErrors.newPassword ? true : undefined}
                              aria-describedby={passwordErrors.newPassword ? "nova-senha-erro" : undefined}
                              className={cn(passwordErrors.newPassword && "border-outflow")}
                            />
                            {passwordErrors.newPassword && <p id="nova-senha-erro" role="alert" className="text-xs text-outflow">{passwordErrors.newPassword.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                            <PasswordInput
                              id="confirmar-senha"
                              autoComplete="new-password"
                              {...registerPassword("confirmPassword")}
                                                            aria-invalid={passwordErrors.confirmPassword ? true : undefined}
                              aria-describedby={passwordErrors.confirmPassword ? "confirmar-senha-erro" : undefined}
                              className={cn(passwordErrors.confirmPassword && "border-outflow")}
                            />
                            {passwordErrors.confirmPassword && <p id="confirmar-senha-erro" role="alert" className="text-xs text-outflow">{passwordErrors.confirmPassword.message}</p>}
                        </div>
                      </div>
                  </CardContent>
                  <CardFooter className="flex justify-end p-5 pt-0">
                      <Button type="submit" loading={isPasswordLoading} disabled={isPasswordLoading}>
                          Atualizar senha
                      </Button>
                  </CardFooter>
              </form>
          </Card>
      </TabsContent>

      {/* --- PRIVACIDADE (LGPD-01 a LGPD-04, LGPD-34) --- */}
      <TabsContent value="privacy" className="mt-0">
          <div className="max-w-2xl space-y-6">
              <ConsentimentoDeMelhoria />
              <ExcluirConta />
          </div>
      </TabsContent>
      </Tabs>
    </div>
  )
}
