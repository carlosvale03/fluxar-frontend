import { api } from "./apiClient"
import { TEMPO_MAXIMO_ARQUIVOS_MS } from "./import-export"

// LGPD-02 a LGPD-08: download dos dados, pedido de exclusão e cancelamento

export interface PedidoDeExclusao {
  // Data e hora ISO da exclusão definitiva, 30 dias depois do pedido
  deletion_scheduled_for: string
  email_sent: boolean
}

export const privacidadeService = {
  // LGPD-02: os dados financeiros em XLSX, liberado em todos os planos
  baixarMeusDados: async (): Promise<Blob> => {
    const response = await api.get("/users/me/export/", {
      responseType: "blob",
      timeout: TEMPO_MAXIMO_ARQUIVOS_MS,
    })
    return response.data
  },

  // LGPD-03 a LGPD-05: confirma a exclusão com a senha atual
  pedirExclusao: async (password: string): Promise<PedidoDeExclusao> => {
    const response = await api.post("/users/me/delete/", { password })
    return response.data
  },
}

// Salva o arquivo recebido da API com o nome dado
export function salvarArquivo(blob: Blob, nome: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", nome)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
