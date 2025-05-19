import { OrganisationBranch } from "src/Modules/Organisation/Entities/organisation-branch.entity";
import { OrganisationDepartment } from "src/Modules/Organisation/Entities/organisation-department.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";

export interface IPurchaseRequisition {
  pr_number: string;
  department: OrganisationDepartment;
  branch?: OrganisationBranch;
  supplier?: Supplier;
  requestor_phone: string;
  requestor_email?: string;
  requestor_name: string;
  request_description: string;
  quantity: number;
  estimated_cost: number;
  justification: string;
  needed_by_date: Date;
  created_by: User;
  status: PurchaseRequisitionStatus;
}
export interface ICreatePurchaseRequisition {
  department_id?: string;
  branch_id?: string;
  supplier_id?: string;
  requestor_phone: string;
  requestor_email: string;
  requestor_name: string;
  request_description: string;
  justification: string;
  needed_by_date: Date;
}

export interface IGetAllPurchaseRequisitionInput {
  organisationId: string;
  status?: PurchaseRequisitionStatus;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  exportAll?: boolean;
}
