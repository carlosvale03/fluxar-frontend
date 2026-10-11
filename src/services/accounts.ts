import { api } from "./apiClient";
import { Account } from "@/types/accounts";

// SALDO-51: sem o parâmetro, a lista traz só as contas ativas
export type StatusDaConta = "active" | "inactive" | "all";

export const accountsService = {
  getAccounts: async (status?: StatusDaConta) => {
    // CONTRATO-01: coleção completa, como array
    const response = status
      ? await api.get<Account[]>("/accounts/", { params: { status } })
      : await api.get<Account[]>("/accounts/");
    return response.data;
  },

  getAccount: async (id: string) => {
    const response = await api.get<Account>(`/accounts/${id}/`);
    return response.data;
  },

  deleteAccount: async (id: string) => {
    await api.delete(`/accounts/${id}/`);
  },

  // SALDO-46 a SALDO-48: o backend recusa com saldo ou pendentes
  deactivateAccount: async (id: string) => {
    const response = await api.post<Account>(`/accounts/${id}/deactivate/`);
    return response.data;
  },

  // SALDO-49 e SALDO-50: pode recusar com plan_limit_reached
  reactivateAccount: async (id: string) => {
    const response = await api.post<Account>(`/accounts/${id}/reactivate/`);
    return response.data;
  },
};
