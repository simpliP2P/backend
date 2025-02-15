import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class CreateSupplierDto {
  @IsString()
  full_name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsOptional()
  bank_details: {
    bank_name: string;
    account_number: number;
    account_name: string;
  };
}

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  full_name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;
}
