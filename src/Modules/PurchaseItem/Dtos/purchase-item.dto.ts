import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { PurchaseItemStatus } from "../Enums/purchase-item.enum";

export class CreatePurchaseItemDto {
  @IsOptional()
  purchase_requisition_id?: string;

  @IsOptional()
  purchase_order_id?: string;

  @IsOptional()
  product_id?: string;

  @IsOptional()
  @IsString()
  item_name?: string;

  @IsInt()
  pr_quantity: number;

  @IsOptional()
  @IsInt()
  po_quantity?: number;

  @IsEnum(PurchaseItemStatus)
  status: PurchaseItemStatus;
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
