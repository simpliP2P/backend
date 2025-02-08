export interface ICreatePurchaseRequisition {
  department_id?: string;
  branch_id?: string;
  contact_info: string;
  requestor_name: string;
  request_description: string;
  quantity: number;
  estimated_cost: number;
  justification: string;
  needed_by_date: Date;
}