export type GoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface Goal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  image?: string;
  account: string;
  status: GoalStatus;
  progress_percentage: number;
  amount_remaining: number;
  suggested_monthly_saving?: number;
  months_remaining?: number;
  created_at: string;
  updated_at: string;
}

export interface GoalTransaction {
  id: string;
  goal: string;
  account: string;
  account_name: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  description?: string;
  datetime: string;
}

export interface CreateGoalData {
  name: string;
  description?: string;
  target_amount: number;
  target_date?: string;
  image?: File | string | null;
  account?: string; // Optional: if null, backend creates auto
  cofrinho_name?: string;
  institution?: string;
  color?: string;
}

export interface GoalDepositData {
  account_from: string;
  amount: number;
  datetime?: string;
  description?: string;
}
