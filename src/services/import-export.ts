import { api } from "./apiClient";

export interface ImportSummary {
  total: number;
  imported: number;
  ignored: number;
  errors: number;
}

export interface SpreadsheetMapping {
  date_column: string;
  description_column: string;
  amount_column: string;
  type_column?: string;
  status_column?: string;
  category_column?: string;
  subcategory_column?: string;
  tags_column?: string;
  account_column?: string;
  source_account_column?: string;
  dest_account_column?: string;
}

export const importExportService = {
  /**
   * Importa transações via arquivo OFX
   */
  importOFX: async (file: File, accountId: string): Promise<ImportSummary> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("account_id", accountId);

    const response = await api.post("/import/ofx/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  /**
   * Realiza o pré-processamento da planilha para extrair contas únicas
   */
  preflightSpreadsheet: async (
    file: File,
    mapping: SpreadsheetMapping,
    importType: "INCOME_EXPENSE" | "TRANSFER"
  ): Promise<{ accounts: string[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));
    formData.append("import_type", importType);

    const response = await api.post("/import/spreadsheet/preflight/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  /**
   * Importa transações via planilha (CSV/XLS/XLSX)
   */
  importSpreadsheet: async (
    file: File,
    accountId: string,
    mapping: SpreadsheetMapping,
    importType: "INCOME_EXPENSE" | "TRANSFER" = "INCOME_EXPENSE",
    accountMapping?: Record<string, string>
  ): Promise<ImportSummary> => {
    const formData = new FormData();
    formData.append("file", file);
    if (accountId) formData.append("account_id", accountId);
    formData.append("mapping", JSON.stringify(mapping));
    formData.append("import_type", importType);
    if (accountMapping) formData.append("account_mapping", JSON.stringify(accountMapping));

    const response = await api.post("/import/spreadsheet/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  /**
   * Exporta transações para PDF
   */
  exportTransactionsPDF: async (filters: any): Promise<Blob> => {
    const response = await api.get("/export/transactions/pdf/", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Exporta transações para XLS
   */
  exportTransactionsXLS: async (filters: any): Promise<Blob> => {
    const response = await api.get("/export/transactions/xls/", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },
};
