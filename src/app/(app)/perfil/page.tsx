"use client"

import { useAuth } from "@/hooks/use-auth"
import { usePlan } from "@/hooks/use-plan"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Camera, CircleCheck } from "lucide-react"

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


import { cn, getAbsoluteUrl } from "@/lib/utils"
import Cropper, { Area } from "react-easy-crop"
import { Slider } from "@/components/ui/slider"
import { getCroppedImg } from "@/lib/image-utils"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { nomeDoPlano, liberacaoDeTestes } = usePlan()
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
                   toast.error("Não foi possível enviar a imagem.")
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
         toast.success("Perfil atualizado.")
         setAvatarDialogOpen(false)
         setAvatarFile(null)
     } catch (error: any) {
         console.error("Profile update error:", error.response?.data)
         const msg = error.response?.data?.detail || "Não foi possível atualizar o perfil."
         toast.error(msg)
     } finally {
         setIsLoading(false)
     }
  }

  return (
    <div className="container mx-auto mb-20 max-w-5xl px-4 py-8">
      <CabecalhoDePagina titulo="Perfil" apoio="Seus dados e foto" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Resumo: foto, nome, e-mail e plano */}
        <Card className="h-fit lg:col-span-1">
          <CardContent className="p-5 text-center">
            <div className="relative mx-auto mb-4 h-24 w-24">
              <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Alterar foto de perfil"
                    className="group relative block h-24 w-24 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Avatar className="h-24 w-24 border border-border-strong">
                      <AvatarImage src={getAbsoluteUrl(user?.avatar_url) || ""} className="object-cover" />
                      <AvatarFallback className="bg-avatar-premium font-mono text-3xl text-foreground">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-elevated text-foreground transition-colors duration-fast ease-az-out group-hover:bg-border-strong"
                    >
                      <Camera className="h-4 w-4" />
                    </span>
                  </button>
                </DialogTrigger>

                <DialogContent className="max-w-[400px] p-0">
                  <DialogHeader className="p-5 pb-0">
                    <DialogTitle>Foto de perfil</DialogTitle>
                    <DialogDescription>
                      Ajuste o enquadramento da sua imagem.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 p-5">
                    {/* Área de recorte */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-canvas">
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
                              cropAreaClassName: "border-2 border-gold-line",
                            }}
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                          <Camera className="h-8 w-8" aria-hidden="true" />
                          <p className="text-sm">Nenhuma foto selecionada</p>
                        </div>
                      )}

                      {/* Trocar a foto fica no canto, para não cobrir o recorte */}
                      {avatarPreview && (
                        <div className="absolute right-3 top-3 z-10">
                          <Button asChild variant="outline" size="sm" className="bg-elevated">
                            <label className="cursor-pointer">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                              <Camera aria-hidden="true" />
                              Trocar
                            </label>
                          </Button>
                        </div>
                      )}
                    </div>

                    {avatarPreview && (
                      <p className="text-center text-xs text-muted-foreground">Arraste a imagem para ajustar.</p>
                    )}

                    {/* Zoom */}
                    {avatarPreview && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span id="zoom-da-foto" className="label text-muted-foreground">Zoom</span>
                          <span className="font-mono text-xs tabular-nums text-foreground">{(zoom * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                          aria-labelledby="zoom-da-foto"
                          value={[zoom]}
                          min={1}
                          max={3}
                          step={0.1}
                          onValueChange={([val]) => setZoom(val)}
                          className="py-2"
                        />
                      </div>
                    )}

                    {!avatarPreview && (
                      <Button asChild variant="outline" className="w-full">
                        <label className="cursor-pointer">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          Escolher arquivo
                        </label>
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 p-5 pt-0">
                    <Button variant="ghost" onClick={() => setAvatarDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleProfileSubmit(onProfileSubmit)}
                      loading={isProfileLoading}
                      disabled={!avatarPreview || isProfileLoading}
                    >
                      Salvar foto
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <h2 className="display-s text-foreground">{user?.name}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{user?.email}</p>

            <div className="flex items-center justify-center gap-2">
              {user?.emailVerified && (
                <Badge variant="success">
                  <CircleCheck className="h-3 w-3" aria-hidden="true" />
                  Verificado
                </Badge>
              )}
            </div>

            {/* PERM-25: o plano real do usuário e, com a liberação ligada, o aviso */}
            {nomeDoPlano && (
              <div className="mt-6 w-full space-y-2 rounded-md border border-border bg-elevated p-4 text-left">
                <p className="label text-gold-line">Plano {nomeDoPlano}</p>
                {liberacaoDeTestes && (
                  <p className="text-xs text-muted-foreground">Todos os recursos estão liberados durante a fase de testes.</p>
                )}
                <Link href="/planos" className="inline-block text-xs font-medium text-gold-line underline underline-offset-2">
                  Ver planos
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-5 pb-4">
            <CardTitle>Informações pessoais</CardTitle>
            <CardDescription>Mantenha seus dados atualizados.</CardDescription>
          </CardHeader>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
            <CardContent className="space-y-5 border-t border-border p-5">
              <div className="space-y-2">
                <Label htmlFor="perfil-nome">Nome completo</Label>
                <Input
                  id="perfil-nome"
                  {...registerProfile("name")}
                  aria-invalid={profileErrors.name ? true : undefined}
                  aria-describedby={profileErrors.name ? "perfil-nome-erro" : undefined}
                  className={cn(profileErrors.name && "border-outflow")}
                />
                {profileErrors.name && (
                  <p id="perfil-nome-erro" className="text-xs text-outflow">{profileErrors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="perfil-cpf">CPF</Label>
                  <Input
                    id="perfil-cpf"
                    {...registerProfile("cpf")}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    onChange={(e) => setValue("cpf", formatCPF(e.target.value))}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perfil-telefone">Telefone</Label>
                  <Input
                    id="perfil-telefone"
                    {...registerProfile("phone_number")}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    onChange={(e) => setValue("phone_number", formatPhone(e.target.value))}
                    className="font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="perfil-nascimento">Data de nascimento</Label>
                <Input
                  id="perfil-nascimento"
                  type="date"
                  {...registerProfile("date_of_birth")}
                  className="font-mono tabular-nums"
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-end p-5 pt-0">
              <Button type="submit" loading={isProfileLoading} disabled={isProfileLoading}>
                Salvar alterações
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
