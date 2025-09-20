import { IGetAllPurchaseRequisitionInput } from "src/Modules/PurchaseRequisition/Types/purchase-requisition.types";

export interface IGetAllProductsInput
  extends Omit<IGetAllPurchaseRequisitionInput, "status" | "userId"> {}

export interface ISearchProductsInput {
  organisationId: string;
  name: string;
  page?: number;
  pageSize?: number;
}
