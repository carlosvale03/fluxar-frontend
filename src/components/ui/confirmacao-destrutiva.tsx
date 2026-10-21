"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface ConfirmacaoDestrutivaProps {
  aberta: boolean
  onAbertaChange: (aberta: boolean) => void
  // "Excluir o cartão Azul?"
  titulo: string
  // O impacto em linguagem comum: o que some junto e se dá para desfazer
  descricao: React.ReactNode
  // O botão repete o verbo e o objeto: "Excluir cartão"
  rotuloConfirmar: string
  // Pode ser assíncrono; enquanto roda, o botão mostra o carregamento e o
  // diálogo não fecha. Se falhar, o diálogo continua aberto.
  onConfirmar: () => void | Promise<void>
}

// AZ-15 (DESIGN.md §5, Modais): o único jeito de confirmar uma ação que não
// tem desfazer. Substitui os Dialogs, AlertDialogs e window.confirm() avulsos.
export function ConfirmacaoDestrutiva({
  aberta,
  onAbertaChange,
  titulo,
  descricao,
  rotuloConfirmar,
  onConfirmar,
}: ConfirmacaoDestrutivaProps) {
  const [confirmando, setConfirmando] = React.useState(false)

  const confirmar = async () => {
    setConfirmando(true)
    try {
      await onConfirmar()
      onAbertaChange(false)
    } catch {
      // Continua aberto; quem confirma mostra o erro (toast ou mensagem)
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <AlertDialog open={aberta} onOpenChange={(valor) => !confirmando && onAbertaChange(valor)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirmando}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" loading={confirmando} onClick={confirmar}>
            {rotuloConfirmar}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
