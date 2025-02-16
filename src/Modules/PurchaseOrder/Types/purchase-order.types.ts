import { IGetAllPurchaseRequisitionInput } from "src/Modules/PurchaseRequisition/Types/purchase-requisition.types";
import { User } from "src/Modules/User/Entities/user.entity";
import { PurchaseOrderStatus } from "../Enums/purchase-order.enum";

export interface IPurchaseOrder {
  id: string;
  po_number: string;
  request_id: string;
  supplier_id: string;
  total_amount: number;
  created_by: Partial<User>;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface IGetAllPurchaseOrdersInput
  extends Omit<IGetAllPurchaseRequisitionInput, "status"> {
  status?: PurchaseOrderStatus;
}
