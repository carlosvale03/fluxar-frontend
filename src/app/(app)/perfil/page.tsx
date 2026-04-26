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
        case 'COMMON': return 'Plano Gratuito'
        case 'PREMIUM': return 'Premium'
        case 'PREMIUM_PLUS': return 'Premium Plus'
        default: return 'Plano Gratuito'
    }
}


import { cn, getAbsoluteUrl } from "@/lib/utils"
import Cropper, { Area } from "react-easy-crop"
import { Slider } from "@/components/ui/slider"
import { getCroppedImg } from "@/lib/image-utils"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [isProfileLoading, setIsLoading] = useState(false)
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  
  // State for avatar preview and cropping
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Profile Form
  const { 
    register: registerProfile, 
    handleSubmit: handleProfileSubmit, 
    formState: { errors: profileErrors }, 
    reset: resetProfile, 
    setValue,
} = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      name: "",
      cpf: "",
      phone_number: "",
      date_of_birth: "",
      avatar_url: "",
    }
  })

  const userJson = JSON.stringify(user)
  const [lastSyncedUserJson, setLastSyncedUserJson] = useState("")

  useEffect(() => {
    if (user && userJson !== lastSyncedUserJson) {
        resetProfile({ 
          name: user.name,
          cpf: user.cpf || "",
          phone_number: user.phone_number || "",
          date_of_birth: user.date_of_birth || "",
          avatar_url: user.avatar_url || "",
        })
        setAvatarPreview(getAbsoluteUrl(user.avatar_url))
        setLastSyncedUserJson(userJson)
    }
  }, [userJson, lastSyncedUserJson, user, resetProfile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
          setAvatarFile(file)
          const objectUrl = URL.createObjectURL(file)
          setAvatarPreview(objectUrl)
          setAvatarDialogOpen(true)
      }
  }

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const onProfileSubmit = async (data: ProfileForm) => {
     try {
         setIsLoading(true)
         
         // 1. Process and Upload Avatar if changed
         if (avatarPreview && croppedAreaPixels && avatarFile) {
             const croppedImage = await getCroppedImg(
               avatarPreview,
               croppedAreaPixels
             )
             
             if (croppedImage) {
               const formData = new FormData()
               formData.append('file', croppedImage, 'avatar.jpg')
               
               try {
                  const uploadRes = await api.post("/users/me/avatar/", formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                  })
                  
                  if (uploadRes.data?.avatar_url) {
                      data.avatar_url = uploadRes.data.avatar_url
                      setAvatarPreview(getAbsoluteUrl(uploadRes.data.avatar_url))
                  }
               } catch (uploadError) {
                   console.error("Avatar upload failed", uploadError)
                   toast.error("Erro ao enviar imagem.")
                   setIsLoading(false)
                   return 
               }
             }
         }

         // 2. Update Profile Data
         const payload = {
            ...user,
            name: data.name,
            cpf: data.cpf || null,
            phone_number: data.phone_number || null,
            date_of_birth: data.date_of_birth || null,
            avatar_url: data.avatar_url || null,
         }

         await api.put("/users/me/", payload)
         await refreshUser()
         toast.success("Perfil atualizado com sucesso!")
         setAvatarDialogOpen(false)
         setAvatarFile(null)
     } catch (error: any) {
         console.error("Profile update error:", error.response?.data)
         const msg = error.response?.data?.detail || "Erro ao atualizar perfil."
         toast.error(msg)
     } finally {
         setIsLoading(false)
     }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl space-y-8 mb-20 animate-in fade-in duration-500">
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <Card className="lg:col-span-1 rounded-[32px] border-border/60 shadow-sm bg-card overflow-hidden h-fit">
          <div className="relative h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-background/50 dark:to-background border-b border-border/40" />
          <CardContent className="px-6 pb-8 -mt-12 text-center">
            <div className="group relative mx-auto h-24 w-24 mb-4">
              <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                <DialogTrigger asChild>
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-muted cursor-pointer transition-all hover:scale-105 hover:ring-primary/40 active:scale-95 z-10">
                    <AvatarImage src={getAbsoluteUrl(user?.avatar_url) || ""} className="object-cover" />
                    <AvatarFallback className="text-3xl font-black bg-avatar-premium text-primary border-none shadow-inner">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DialogTrigger>
                
                <div 
                  onClick={() => setAvatarDialogOpen(true)}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-primary text-primary-foreground shadow-lg ring-2 ring-background flex items-center justify-center cursor-pointer hover:scale-110 active:scale-90 transition-all z-20 animate-in zoom-in duration-300"
                >
                  <Camera className="h-4 w-4" />
                </div>

                <DialogContent className="rounded-[32px] max-w-[400px] border-none shadow-2xl overflow-hidden p-0 bg-background/95 backdrop-blur-xl">
                  <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Foto de Perfil</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                      Ajuste o enquadramento da sua imagem
                    </DialogDescription>
                  </DialogHeader>

                  <div className="p-8 space-y-8">
                    {/* Cropper Container */}
                    <div className="relative w-full aspect-square rounded-[32px] overflow-hidden bg-zinc-950 border border-border/40 shadow-2xl group ring-1 ring-white/10">
                      {avatarPreview ? (
                        <div className="absolute inset-0">
                          <Cropper
                            image={avatarPreview}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            cropShape="round"
                            showGrid={true}
                            classes={{
                              containerClassName: "rounded-[32px]",
                              mediaClassName: "rounded-[32px]",
                              cropAreaClassName: "border-2 border-primary shadow-[0_0_0_1000px_rgba(0,0,0,0.7)]",
                            }}
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-40">
                          <div className="w-16 h-16 rounded-[24px] bg-background border border-border/40 flex items-center justify-center shadow-sm">
                            <Camera className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma foto selecionada</p>
                        </div>
                      )}
                      
                      {/* Botão de Trocar Foto - Posicionado para não bloquear o Cropper */}
                      <div className="absolute top-4 right-4 z-50">
                        <label className="cursor-pointer">
                          <Input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <div className="bg-background/80 backdrop-blur-md h-10 px-4 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2 hover:bg-primary hover:text-white transition-all active:scale-95 group">
                            <Camera className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Trocar</span>
                          </div>
                        </label>
                      </div>

                      {/* Dica de interação */}
                      {avatarPreview && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-500">
                          <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/70">Arraste para ajustar</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    {avatarPreview && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Zoom</span>
                            <span className="text-[10px] font-black tabular-nums text-primary">{(zoom * 100).toFixed(0)}%</span>
                          </div>
                          <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={([val]) => setZoom(val)}
                            className="py-2"
                          />
                        </div>
                      </div>
                    )}

                    {!avatarPreview && (
                      <Button 
                        asChild
                        variant="outline"
                        className="w-full h-12 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary/20 transition-all font-bold"
                      >
                        <label className="cursor-pointer">
                          <Input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          Escolher Arquivo
                        </label>
                      </Button>
                    )}
                  </div>

                  <div className="p-8 pt-0 flex gap-3">
                    <Button 
                      variant="ghost" 
                      onClick={() => setAvatarDialogOpen(false)}
                      className="flex-1 rounded-full h-12 font-bold text-muted-foreground"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleProfileSubmit(onProfileSubmit)} 
                      loading={isProfileLoading} 
                      disabled={!avatarPreview || isProfileLoading}
                      className="flex-2 rounded-full h-12 px-8 font-bold shadow-xl shadow-primary/25 bg-primary text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Salvar Foto
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-foreground">{user?.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
            
            <div className="flex items-center justify-center gap-2">
              {user?.emailVerified && (
                <Badge className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-green-500/10 text-green-600 border border-green-200 dark:border-green-900/50">
                  Verificado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card className="lg:col-span-2 rounded-[32px] border-border/60 shadow-sm bg-card overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                <Edit2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Informações Pessoais</CardTitle>
                <CardDescription>Mantenha seus dados sempre atualizados.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="bg-border/40" />
          <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Nome Completo</label>
                <Input 
                  {...registerProfile("name")} 
                  className={cn(
                    "rounded-2xl h-12 transition-all duration-300",
                    profileErrors.name ? "border-destructive focus-visible:ring-destructive/20" : "focus-visible:ring-primary/20"
                  )}
                />
                {profileErrors.name && <p className="text-[10px] font-bold text-destructive uppercase ml-1">{profileErrors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">CPF</label>
                  <Input 
                    {...registerProfile("cpf")} 
                    placeholder="000.000.000-00" 
                    onChange={(e) => setValue("cpf", formatCPF(e.target.value))}
                    className="rounded-2xl h-12 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Telefone</label>
                  <Input 
                    {...registerProfile("phone_number")} 
                    placeholder="(00) 00000-0000" 
                    onChange={(e) => setValue("phone_number", formatPhone(e.target.value))}
                    className="rounded-2xl h-12 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1">Data de Nascimento</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                  <Input 
                    type="date" 
                    {...registerProfile("date_of_birth")} 
                    className="rounded-2xl h-12 pl-12 focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="p-8 pt-0 flex justify-end">
              <Button type="submit" loading={isProfileLoading} disabled={isProfileLoading} className="rounded-full px-8 h-11 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                Salvar Alterações
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
