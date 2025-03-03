export interface BankDetails {
  bank_name: string;
  account_number: number;
  account_name: string;
  swift_code: string;
  bank_key: string;
}

export interface SupplierMetadata {
  completed_orders: number;
  pending_orders: number;
  total_orders: number;
  total_amount: number;
}
