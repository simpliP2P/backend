import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
export class CreateDepartmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsUUID()
  @IsOptional()
  branch_id: string;

  @IsOptional()
  @IsString()
  department_code?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsUUID()
  hod_id?: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
