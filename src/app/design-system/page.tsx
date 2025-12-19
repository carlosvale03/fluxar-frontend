"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Modal } from "@/components/ui/modal"
import { AlertCircle, CheckCircle2, User } from "lucide-react"

export default function DesignSystemPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="container mx-auto space-y-10 py-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Fluxar Design System</h1>
        <p className="text-xl text-muted-foreground">Componentes base para construção da interface.</p>
      </div>

      {/* Colors Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cores e Tema</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <div className="space-y-2">
            <div className="h-20 w-full rounded-lg bg-brand-500 shadow-sm"></div>
            <p className="text-sm font-medium">Brand 500 (Primary)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 w-full rounded-lg bg-brand-600 shadow-sm"></div>
            <p className="text-sm font-medium">Brand 600 (Hover)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 w-full rounded-lg bg-brand-900 shadow-sm"></div>
            <p className="text-sm font-medium">Brand 900</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 w-full rounded-lg bg-background border px-2 flex items-center justify-center text-foreground shadow-sm">Text</div>
            <p className="text-sm font-medium">Background</p>
          </div>
          <div className="space-y-2">
             <div className="h-20 w-full rounded-lg bg-card border px-2 flex items-center justify-center text-card-foreground shadow-sm">Card</div>
             <p className="text-sm font-medium">Card Surface</p>
          </div>
        </div>
      </section>

      {/* Buttons Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Botões</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link Button</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button size="icon"><User className="h-4 w-4"/></Button>
        </div>
      </section>

      {/* Form Elements */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Inputs & Forms</h2>
        <div className="grid max-w-sm gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
            <Input type="email" placeholder="seu@email.com" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Senha</label>
            <Input type="password" placeholder="••••••••" />
          </div>
           <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Disabled</label>
            <Input disabled placeholder="Input Desabilitado" />
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cards</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Saldo Atual</CardTitle>
              <CardDescription>Visão geral das suas contas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-brand-500">R$ 13.055,39</p>
            </CardContent>
            <CardFooter>
              <div className="flex gap-2">
                 <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3"/> +12%</Badge> 
                 <span className="text-xs text-muted-foreground self-center">vs mês anterior</span>
              </div>
            </CardFooter>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>Últimas Transações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <span>Netflix</span>
                  <Badge variant="destructive">R$ 55,90</Badge>
              </div>
               <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <span>Freela</span>
                  <Badge variant="success">R$ 2.500,00</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badges</h2>
        <div className="flex gap-4">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success">Success</Badge>
        </div>
      </section>

       {/* Feedback */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Feedback & Modal</h2>
        <div className="flex gap-4">
          <Button onClick={() => setIsModalOpen(true)}>Abrir Modal</Button>
           <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Exemplo de Modal">
              <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                      Este é um componente de modal simples. Ele bloqueia o scroll do body e foca na interação.
                  </p>
                  <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                      <Button onClick={() => setIsModalOpen(false)}>Confirmar</Button>
                  </div>
              </div>
           </Modal>
        </div>
         <div className="space-y-2">
            <h3 className="text-lg font-medium">Skeleton Loader</h3>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
         </div>
      </section>
    </div>
  )
}
