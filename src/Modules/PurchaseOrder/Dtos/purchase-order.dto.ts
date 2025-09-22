import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";

export class CreatePurchaseOrderDto {
  @IsNotEmpty()
  @IsNumber()
  total_amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|.+/)
  supplier_id: string;

  @IsUUID()
  request_id: string;

  @IsString()
  attachment: string;
}

export class UpdatePurchaseOrderDto {
  @IsNumber()
  delivery_fee: number;

  @IsNumber()
  vat_percent: number;
}
