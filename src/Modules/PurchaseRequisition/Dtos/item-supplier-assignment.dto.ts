import { IsUUID } from "class-validator";

export class ItemSupplierAssignmentDto {
  @IsUUID()
  item_id: string;

  @IsUUID()
  supplier_id: string;
}
