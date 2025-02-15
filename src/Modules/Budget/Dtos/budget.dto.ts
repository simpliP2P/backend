import {
  IsString,
  IsNotEmpty,
  IsDecimal,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsNumber,
} from "class-validator";

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  @IsNotEmpty()
  @IsUUID()
  branchId: string; // ID of OrganisationBranch

  @IsNotEmpty()
  @IsUUID()
  departmentId: string; // ID of OrganisationDepartment

  @IsOptional()
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  organisationId: string;
}

export class UpdateBudgetDto extends CreateBudgetDto {}
