import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsEnum,
} from "class-validator";
import { Address } from "src/Shared/Interfaces/address.interface";
import { PaymentTerms } from "../Enums/supplier.enum";

export class CreateSupplierDto {
  @IsString()
  full_name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  address?: Address;

  @IsUUID()
  @IsOptional()
  category?: string;

  @IsString()
  @IsEnum(PaymentTerms)
  @IsOptional()
  payment_term: PaymentTerms;

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

  @IsUUID()
  @IsOptional()
  category?: string;

  @IsString()
  @IsEnum(PaymentTerms)
  @IsOptional()
  payment_term: PaymentTerms;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;
}
