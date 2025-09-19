import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from "class-validator";
import { PurchaseItemStatus } from "../Enums/purchase-item.enum";

export class PurchaseItemDto {
  @IsUUID()
  pr_id: string;

  @IsOptional()
  @IsUUID()
  purchase_order_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsString()
  item_name: string;

  @IsInt()
  @Min(1)
  pr_quantity: number;

  @IsNumber()
  unit_price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  po_quantity?: number;

  @IsOptional()
  @IsString()
  image_url: string;

  @IsOptional()
  @IsEnum(PurchaseItemStatus)
  status: PurchaseItemStatus;
}
export class CreatePurchaseItemDto {
  @IsString()
  pr_id: string;

  item: PurchaseItemDto;
}

export class UpdatePurchaseItemDto {
  @IsOptional()
  @IsInt()
  pr_quantity?: number;

  @IsOptional()
  @IsInt()
  po_quantity?: number;

  @IsOptional()
  @IsInt()
  unit_price?: number;

  @IsOptional()
  @IsEnum(PurchaseItemStatus)
  status?: PurchaseItemStatus;

  @IsOptional()
  @IsString()
  @IsUUID()
  @ValidateIf((_, value) => value !== "" && value != null)
  supplier_id?: string;
}
