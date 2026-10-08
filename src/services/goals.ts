import { api } from "./apiClient";
import { paraApi } from "@/lib/datas";
import { Cofrinho, CreateGoalData, Goal, GoalDepositData, GoalTransaction } from "@/types/goals";

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
          formData.append(key, value);
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
          formData.append(key, value);
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

  deleteGoal: async (id: string) => {
    await api.delete(`/goals/${id}/`);
  },

  deposit: async (id: string, data: GoalDepositData) => {
    const response = await api.post<GoalTransaction>(`/goals/${id}/deposit/`, data);
    return response.data;
  },
  
  withdraw: async (id: string, data: any) => {
    const response = await api.post<GoalTransaction>(`/goals/${id}/withdraw/`, data);
    return response.data;
  },

  getHistory: async (id: string) => {
    const response = await api.get<GoalTransaction[]>(`/goals/${id}/history/`);
    return response.data;
  },
};
