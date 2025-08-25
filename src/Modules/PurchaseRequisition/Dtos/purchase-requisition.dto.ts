import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { IsDateAtLeastToday } from "src/Modules/Organisation/Dtos/organisation.dto";
import {
  PRApprovalActionType,
  PurchaseRequisitionStatus,
} from "../Enums/purchase-requisition.enum";

export class InitializePurchaseRequisitionDto {
  @IsUUID()
  organisationId: string;

  @IsUUID()
  @IsOptional()
  branchId: string;

  @IsUUID()
  @IsOptional()
  departmentId: string;
}

export class CreatePurchaseRequisitionDto {
  @IsString()
  pr_number: string;

  @IsUUID()
  @IsOptional()
  department_id: string;

  @IsUUID()
  @IsOptional()
  branch_id: string;

  @IsUUID()
  @IsOptional()
  supplier_id: string;

  @IsString()
  requestor_phone: string;

  @IsString()
  requestor_name: string;

  @IsEmail()
  @IsOptional()
  requestor_email: string;

  @IsString()
  request_description: string;

  @IsString()
  currency: string;

  @IsString()
  justification: string;

  // @IsString()
  // @IsOptional()
  // shipping_address: string;

  @IsDateAtLeastToday({
    message: "Needed by date must be today or in the future",
  })
  needed_by_date: Date;
}

export class ApprovalDataDto {
  @IsEnum(PurchaseRequisitionStatus)
  status: PurchaseRequisitionStatus;

  @IsString()
  approval_justification: string;

  @IsUUID()
  budget_id: string;

  @IsEnum(PRApprovalActionType)
  action_type: PRApprovalActionType;

  @IsUUID()
  @IsOptional()
  supplier_id?: string;
}
