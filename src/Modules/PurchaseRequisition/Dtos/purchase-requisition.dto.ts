import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from "class-validator";
import { IsDateAtLeastToday } from "src/Modules/Organisation/Dtos/organisation.dto";
import {
  PRApprovalActionType,
  // PurchaseRequisitionStatus,
} from "../Enums/purchase-requisition.enum";
import { AtLeastOneField } from "src/Shared/Decorators/custom.decorator";

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

  @IsOptional()
  @IsString()
  @IsUUID()
  @ValidateIf((_, value) => value !== "" && value != null)
  supplier_id?: string;

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

  @IsDateAtLeastToday({
    message: "Needed by date must be today or in the future",
  })
  needed_by_date: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_fee: number;
}

export class SavedPurchaseRequisitionDto {
  @IsString()
  pr_number: string;

  @IsUUID()
  @IsOptional()
  department_id?: string;

  @IsUUID()
  @IsOptional()
  branch_id?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  @ValidateIf((_, value) => value !== "" && value != null)
  supplier_id?: string;

  @IsString()
  @IsOptional()
  @AtLeastOneField(["pr_number"], {
    message: "At least one field besides pr_number must be provided",
  })
  requestor_phone?: string;

  @IsString()
  @IsOptional()
  requestor_name?: string;

  @IsEmail()
  @IsOptional()
  requestor_email?: string;

  @IsString()
  @IsOptional()
  request_description?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsDateAtLeastToday({
    message: "Needed by date must be today or in the future",
  })
  @IsOptional()
  needed_by_date?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_fee?: number;
}

export class UpdatePurchaseRequisitionDto extends CreatePurchaseRequisitionDto {}

export class ApprovalDataDto {
  @IsString()
  approval_justification: string;

  @IsUUID()
  @IsOptional()
  budget_id?: string;

  @IsEnum(PRApprovalActionType)
  action_type: PRApprovalActionType;
}
