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
import { NotificationChannels, PaymentTerms } from "../Enums/supplier.enum";
import { BankDetails } from "../Types/supplier.types";

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

  @IsString()
  @IsOptional()
  lead_time?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsOptional()
  bank_details: BankDetails;

  @IsString()
  @IsOptional()
  @IsEnum(NotificationChannels)
  notification_channel: NotificationChannels;
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
  address?: Address;

  @IsUUID()
  @IsOptional()
  category?: string;

  @IsString()
  @IsEnum(PaymentTerms)
  @IsOptional()
  payment_term: PaymentTerms;

  @IsString()
  @IsOptional()
  lead_time?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsOptional()
  bank_details: BankDetails;

  @IsString()
  @IsEnum(NotificationChannels)
  @IsOptional()
  notification_channel: NotificationChannels;
}
