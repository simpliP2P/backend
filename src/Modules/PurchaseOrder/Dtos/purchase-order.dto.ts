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
  @IsOptional()
  @IsString()
  po_number?: string;

  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  organisation_id?: string;

  @IsOptional()
  @IsString()
  supplier_id?: string;

  @IsOptional()
  @IsString()
  pr_id?: string;
}
