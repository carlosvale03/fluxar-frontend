import { api } from "./apiClient";
import { Account } from "@/types/accounts";

// SALDO-53: sem o parâmetro, a lista traz só as contas ativas
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

  // SALDO-48 a SALDO-50: o backend recusa com saldo ou pendentes
  deactivateAccount: async (id: string) => {
    const response = await api.post<Account>(`/accounts/${id}/deactivate/`);
    return response.data;
  },

  // SALDO-51 e SALDO-52: pode recusar com plan_limit_reached
  reactivateAccount: async (id: string) => {
    const response = await api.post<Account>(`/accounts/${id}/reactivate/`);
    return response.data;
  },
};
