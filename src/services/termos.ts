import { api } from "./apiClient"

// LGPD-28 a LGPD-31: a versão vigente dos termos e da política

export interface ServicoQueTrataOsDados {
  name: string
  purpose: string
}

export interface TermosVigentes {
  version: string
  // "AAAA-MM-DD"
  effective_date: string
  // O que mudou em relação à versão anterior
  changes: string[]
  services: ServicoQueTrataOsDados[]
}

export interface AceiteDosTermos {
  accepted_version: string
  current_version: string
}

export const termosService = {
  obter: async (): Promise<TermosVigentes> => {
    const response = await api.get("/terms/")
    return response.data
  },

  aceitar: async (version: string): Promise<AceiteDosTermos> => {
    const response = await api.post("/terms/accept/", { version })
    return response.data
  },
}
