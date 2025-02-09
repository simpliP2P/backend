import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";
import { PurchaseItemStatus } from "../Enums/purchase-item.enum";

export class PurchaseItemDto {
  @IsOptional()
  @IsUUID()
  pr_id: string;

  @IsString()
  pr_number: string;

  @IsOptional()
  @IsUUID()
  purchase_order_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsString()
  item_name?: string;

  @IsInt()
  pr_quantity: number;

  @IsNumber()
  unit_price: number;

  @IsOptional()
  @IsInt()
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
  @IsEnum(PurchaseItemStatus)
  status?: PurchaseItemStatus;
}
