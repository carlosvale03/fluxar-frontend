import { toast } from "sonner"

// AZ-19 e D-10: exclusão simples avisa por 5 segundos com o botão Desfazer.
// Exclusões em cascata ou irreversíveis usam a ConfirmacaoDestrutiva.
export const DURACAO_DO_DESFAZER = 5000

export function avisarComDesfazer(mensagem: string, desfazer: () => void | Promise<void>) {
  toast(mensagem, {
    duration: DURACAO_DO_DESFAZER,
    action: { label: "Desfazer", onClick: () => void desfazer() },
  })
}
