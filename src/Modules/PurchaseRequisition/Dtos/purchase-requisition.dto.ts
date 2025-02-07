import { IsOptional, IsUUID } from "class-validator";

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