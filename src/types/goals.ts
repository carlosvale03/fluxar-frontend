export type GoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface Goal {
  id: string;
  name: string;
  description?: string;
  target_amount: string;
  current_amount: string;
  target_date?: string;
  image?: string;
  account: string;
  is_active?: boolean;
  status: GoalStatus;
  progress_percentage: number;
  amount_remaining: string;
  suggested_monthly_saving?: string;
  months_remaining?: number;
  // META-11: aviso único da correção do valor, até o usuário confirmar
  correction?: { before: string; after: string } | null;
  created_at: string;
  updated_at: string;
}

// META-02 e META-04: cofrinho com metas, com valores em texto (AD-041); o
// saldo livre pode ser negativo
export interface Cofrinho {
  account_id: string;
  name: string;
  balance: string;
  goals_total: string;
  free_balance: string;
}

export interface GoalTransaction {
  id: string;
  goal: string;
  account: string;
  account_name: string;
  amount: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  description?: string;
  // CONTRATO-24: data sem hora
  date: string;
  // META-32: o transfer_id da transferência, ou nulo sem transferência
  transaction: string | null;
  // META-11: registro de correção do valor da meta
  is_correction: boolean;
}

export interface CreateGoalData {
  name: string;
  description?: string;
  target_amount: string;
  target_date?: string;
  image?: File | string | null;
  account?: string; // Optional: if null, backend creates auto
  cofrinho_name?: string;
  institution?: string;
  color?: string;
}

// META-12 e META-13: a conta de origem ou o saldo livre do cofrinho
export interface GoalDepositData {
  account_from?: string;
  from_free_balance?: true;
  amount: string;
  // CONTRATO-25: AAAA-MM-DD; sem ela, a API usa hoje
  date?: string;
  description?: string;
}

// META-15 e META-16: a conta de destino ou o saldo livre do cofrinho
export interface GoalWithdrawData {
  account_to?: string;
  to_free_balance?: true;
  amount: string;
  // CONTRATO-25: AAAA-MM-DD; sem ela, a API usa hoje
  date?: string;
}

// Valor do Select de origem ou destino que indica o saldo livre do cofrinho
export const SALDO_LIVRE = "saldo-livre";
