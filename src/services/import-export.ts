import { api } from "./apiClient";
import { paraApi } from "@/lib/datas";
import type { FilterState } from "@/components/transactions/transaction-filters";
import type {
  AcaoDaConta,
  AnaliseDeImportacao,
  PlanoDeImportacao,
  ResultadoDaImportacao,
} from "@/types/importacao";

// CONTRATO-34: importação e exportação podem levar até 120 segundos; as
// demais requisições ficam com os 30 segundos do apiClient
export const TEMPO_MAXIMO_ARQUIVOS_MS = 120_000;

// IMPORT-29, IMPORT-30 e IMPORT-45: o resumo de toda importação aceita (200).
// `total` são as linhas lidas; cada rejeitada vem com o número dela no
// arquivo e o motivo; `batch_id` leva à lista das sugeridas.
export interface LinhaRejeitada {
  line: number;
  reason: string;
}

export interface ImportSummary {
  total: number;
  imported: number;
  ignored: number;
  rejected: number;
  suggested: number;
  batch_id: string;
  rejected_rows: LinhaRejeitada[];
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

// CONTRATO-12 e CONTRATO-25: os filtros da exportação no formato da API.
// Vários valores repetem o parâmetro (categoryId=a&categoryId=b, sem o
// tagIds[] do axios), "ALL" não vai, e as datas vão como AAAA-MM-DD (o axios
// mandava o Date por toISOString, em UTC).
export function paramsDaExportacao(filtros: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.startDate) params.append("startDate", paraApi(filtros.startDate));
  if (filtros.endDate) params.append("endDate", paraApi(filtros.endDate));
  if (filtros.type && filtros.type !== "ALL") params.append("type", filtros.type);
  filtros.categoryIds.filter((id) => id !== "ALL").forEach((id) => params.append("categoryId", id));
  if (filtros.accountId && filtros.accountId !== "ALL") params.append("accountId", filtros.accountId);
  (filtros.tagIds ?? []).forEach((id) => params.append("tagIds", id));
  // CLASSE-39: o filtro de classe com o mesmo significado da lista
  (filtros.classIds ?? []).forEach((id) => params.append("classId", id));
  // VINCULO-33: o filtro de vínculo com o mesmo significado da lista; o
  // arquivo não leva o vínculo
  if (filtros.linked) params.append("linked", "true");
  return params;
}

// IMPCOMP-13 e IMPCOMP-45: o plano vai como texto JSON no multipart. Os
// campos que só a análise devolve (motivo, cabeçalho, dados da conta no
// arquivo) ficam de fora do envio.
export function planoDoEnvio(plano: PlanoDeImportacao): PlanoDeImportacao {
  const enviado: PlanoDeImportacao = {}
  if (plano.abas) {
    enviado.abas = plano.abas.map(({ nome, papel, colunas }) => (colunas ? { nome, papel, colunas } : { nome, papel }))
  }
  if (plano.contas) {
    enviado.contas = Object.fromEntries(
      Object.entries(plano.contas).map(([nome, acao]) => {
        const semArquivo: AcaoDaConta = { ...acao }
        delete semArquivo.arquivo
        return [nome, semArquivo]
      }),
    )
  }
  if (plano.linhas) enviado.linhas = plano.linhas
  return enviado
}

function formularioDoPlano(file: File, plano?: PlanoDeImportacao): FormData {
  const formData = new FormData()
  formData.append("file", file)
  if (plano) formData.append("plano", JSON.stringify(planoDoEnvio(plano)))
  return formData
}

// AD-055: a análise nunca grava; a importação grava o plano final
export async function analisarArquivo(file: File, plano?: PlanoDeImportacao): Promise<AnaliseDeImportacao> {
  const response = await api.post("/import/analise/", formularioDoPlano(file, plano), {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: TEMPO_MAXIMO_ARQUIVOS_MS,
  })
  return response.data
}

export async function importarArquivo(file: File, plano: PlanoDeImportacao): Promise<ResultadoDaImportacao> {
  const response = await api.post("/import/", formularioDoPlano(file, plano), {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: TEMPO_MAXIMO_ARQUIVOS_MS,
  })
  return response.data
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
      timeout: TEMPO_MAXIMO_ARQUIVOS_MS,
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
      timeout: TEMPO_MAXIMO_ARQUIVOS_MS,
    });

    return response.data;
  },

  /**
   * Importa transações via planilha (CSV ou XLSX, IMPORT-03)
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
      timeout: TEMPO_MAXIMO_ARQUIVOS_MS,
    });

    return response.data;
  },

  /**
   * Exporta transações para PDF
   */
  exportTransactionsPDF: async (filters: FilterState): Promise<Blob> => {
    const response = await api.get("/export/transactions/pdf/", {
      params: paramsDaExportacao(filters),
      responseType: "blob",
      timeout: TEMPO_MAXIMO_ARQUIVOS_MS,
    });
    return response.data;
  },

  /**
   * Exporta transações para XLS
   */
  exportTransactionsXLS: async (filters: FilterState): Promise<Blob> => {
    const response = await api.get("/export/transactions/xls/", {
      params: paramsDaExportacao(filters),
      responseType: "blob",
      timeout: TEMPO_MAXIMO_ARQUIVOS_MS,
    });
    return response.data;
  },
};
