import { api } from "./apiClient";
import { Account } from "@/types/accounts";

export const accountsService = {
  getAccounts: async () => {
    // CONTRATO-01: coleção completa, como array
    const response = await api.get<Account[]>("/accounts/");
    return response.data;
  },
  
  getAccount: async (id: string) => {
    const response = await api.get<Account>(`/accounts/${id}/`);
    return response.data;
  },
};
