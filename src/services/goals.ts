import { api } from "./apiClient";
import type { PaginatedResponse } from "./admin";
import { paraApi } from "@/lib/datas";
import {
  Cofrinho,
  ConfiguracaoDeTrocos,
  CreateGoalData,
  DepositoDeTrocos,
  Goal,
  GoalDepositData,
  GoalTransaction,
  GoalWithdrawData,
} from "@/types/goals";

// LGPD-20: a imagem da meta vai com um nome genérico; o nome original do
// arquivo pode conter o nome da pessoa
const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function nomeGenericoDaImagem(arquivo: File): string {
  return `imagem-da-meta.${EXTENSOES[arquivo.type] ?? "jpg"}`;
}

export const goalsService = {
  getGoals: async () => {
    // CONTRATO-01: coleção completa, como array
    const response = await api.get<Goal[]>("/goals/");
    return response.data;
  },

  // META-04: saldo, soma das metas e saldo livre de cada cofrinho
  getPiggyBanks: async () => {
    const response = await api.get<Cofrinho[]>("/goals/piggy-banks/");
    return response.data;
  },

  getGoal: async (id: string) => {
    const response = await api.get<Goal>(`/goals/${id}/`);
    return response.data;
  },

  createGoal: async (data: CreateGoalData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'image' && value instanceof File) {
          formData.append(key, value, nomeGenericoDaImagem(value));
        } else if (value instanceof Date) {
          // CONTRATO-25: data sem hora pelos componentes locais, não em UTC
          formData.append(key, paraApi(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await api.post<Goal>("/goals/", formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateGoal: async (id: string, data: Partial<CreateGoalData>) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'image' && value instanceof File) {
          formData.append(key, value, nomeGenericoDaImagem(value));
        } else if (value instanceof Date) {
          // CONTRATO-25: data sem hora pelos componentes locais, não em UTC
          formData.append(key, paraApi(value));
        } else {
          formData.append(key, value.toString());
        }
      } else if (value === null) {
          // Explicit null can be used to clear fields if backend supports it
          formData.append(key, "");
      }
    });

    const response = await api.patch<Goal>(`/goals/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // META-30: diz se o cofrinho ficou sem metas e com saldo zero
  deleteGoal: async (id: string) => {
    const response = await api.delete<{ piggy_bank_empty: boolean }>(`/goals/${id}/`);
    return response.data;
  },

  deposit: async (id: string, data: GoalDepositData) => {
    const response = await api.post<GoalTransaction>(`/goals/${id}/deposit/`, data);
    return response.data;
  },
  
  withdraw: async (id: string, data: GoalWithdrawData) => {
    const response = await api.post<GoalTransaction>(`/goals/${id}/withdraw/`, data);
    return response.data;
  },

  // META-32: histórico paginado (CONTRATO-02), do mais recente ao mais antigo
  getHistory: async (id: string, page = 1, pageSize?: number) => {
    const params = pageSize ? { page, page_size: pageSize } : { page };
    const response = await api.get<PaginatedResponse<GoalTransaction>>(`/goals/${id}/history/`, { params });
    return response.data;
  },

  // META-35 e META-37: configuração e trocos pendentes
  getSpareChange: async () => {
    const response = await api.get<ConfiguracaoDeTrocos>("/goals/spare-change/");
    return response.data;
  },

  // META-35, META-44 e META-45: ativar, escolher a meta ou desativar
  updateSpareChange: async (data: { active: boolean; goal?: string }) => {
    const response = await api.put<ConfiguracaoDeTrocos>("/goals/spare-change/", data);
    return response.data;
  },

  // META-38 a META-40 e META-43: deposita os trocos pendentes uma vez só
  depositSpareChange: async () => {
    const response = await api.post<DepositoDeTrocos>("/goals/spare-change/deposit/");
    return response.data;
  },

  // META-11: o usuário viu o aviso da correção do valor
  dismissCorrection: async (id: string) => {
    const response = await api.post<Goal>(`/goals/${id}/dismiss-correction/`);
    return response.data;
  },
};
