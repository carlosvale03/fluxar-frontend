import { api } from "./apiClient";
import { Account } from "@/types/accounts";

export const accountsService = {
  getAccounts: async () => {
    const response = await api.get("/accounts/");
    // Support both direct array and paginated results
    const data = Array.isArray(response.data) ? response.data : response.data.results;
    return data || [];
  },
  
  getAccount: async (id: string) => {
    const response = await api.get<Account>(`/accounts/${id}/`);
    return response.data;
  },
};
