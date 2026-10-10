"use client"

import { useId, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tratarErro } from "@/lib/erros"
import { cn } from "@/lib/utils"

// ADMIN-17 e ADMIN-18: o campo da senha do administrador, com o erro da API
// logo abaixo dele
export function CampoDaSenhaDoAdmin({
  valor,
  onChange,
  erro,
  className,
}: {
  valor: string
  onChange: (valor: string) => void
  erro?: string
  className?: string
}) {
  const id = useId()
  const [mostrar, setMostrar] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest opacity-50">
        Sua senha de administrador
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={mostrar ? "text" : "password"}
          placeholder="Sua senha de acesso admin"
          className={cn("rounded-xl border-border/40 bg-muted/20 focus:ring-primary/20 pr-10", erro && "border-red-500", className)}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          aria-invalid={!!erro}
          aria-describedby={erro ? `${id}-erro` : undefined}
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
          onClick={() => setMostrar(!mostrar)}
          type="button"
          aria-label={mostrar ? "Esconder a senha" : "Mostrar a senha"}
        >
          {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {erro && (
        <p id={`${id}-erro`} className="text-xs font-bold text-red-500">
          {erro}
        </p>
      )}
    </div>
  )
}

// ADMIN-20: limpar e excluir só confirmam com o e-mail do usuário digitado igual
export function CampoDoEmailDeConfirmacao({
  email,
  valor,
  onChange,
}: {
  email: string
  valor: string
  onChange: (valor: string) => void
}) {
  const id = useId()
  const confere = emailConfere(email, valor)

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest opacity-50">
        Digite o e-mail do usuário para confirmar
      </Label>
      <p className="text-xs font-bold text-muted-foreground">
        E-mail: <span className="font-mono text-foreground">{email}</span>
      </p>
      <Input
        id={id}
        type="text"
        placeholder={email}
        className="rounded-xl border-border/40 bg-muted/20 focus:ring-primary/20"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={valor !== "" && !confere}
      />
      {valor !== "" && !confere && (
        <p className="text-xs font-bold text-red-500">O e-mail digitado não é o deste usuário.</p>
      )}
    </div>
  )
}

export function emailConfere(email: string, digitado: string) {
  return digitado.trim() === email
}

// O que a limpeza apaga e o que mantém (ADMIN-21 a ADMIN-23)
export const APAGADO_NA_LIMPEZA = [
  "Transações, recorrências e os vínculos entre transações",
  "Contas, cartões e faturas",
  "Categorias, classes e tags (voltam as padrão e a conta Carteira)",
  "Orçamentos, metas (com as imagens) e monitores de foco",
  "O plano da gestão do salário",
]
export const MANTIDO_NA_LIMPEZA = "Login, senha, perfil, plano e papel."

// O que a exclusão definitiva apaga (LGPD-13)
export const APAGADO_NA_EXCLUSAO = [
  "A conta, o login e os dados do perfil, inclusive o avatar",
  "Transações, recorrências, contas, cartões e faturas",
  "Categorias, classes, tags, orçamentos, metas (com as imagens) e monitores de foco",
]

// 503 em que nada foi apagado e o backend explica o porquê (LGPD-12, ADMIN-24)
const CODIGOS_COM_EXPLICACAO = ["clear_failed", "deletion_failed"]

// O erro de uma ação confirmada pela senha: 403 da senha no campo, 503 com a
// explicação do backend, e o resto pelo tratarErro (AD-042)
export function tratarErroDaAcao(
  erro: unknown,
  { aoErrarSenha, mensagemPadrao }: { aoErrarSenha: (mensagem: string) => void; mensagemPadrao: string },
) {
  const resposta = (erro as { response?: { status?: number; data?: { code?: unknown; detail?: unknown } } } | null)?.response
  const dados = resposta?.data
  if (resposta?.status === 503 && CODIGOS_COM_EXPLICACAO.includes(dados?.code as string) && typeof dados?.detail === "string") {
    toast.error(dados.detail)
    return
  }
  tratarErro(erro, {
    form: { setError: (_campo: never, { message }: { message: string }) => aoErrarSenha(message) },
    campos: ["admin_password"],
    mensagemPadrao,
  })
}
