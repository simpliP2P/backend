import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { ExportEntityType } from "src/Modules/ExportData/Enums/export.enum";

export const ExportEntityPermissionMap: Record<
  ExportEntityType,
  PermissionType[]
> = {
  [ExportEntityType.PRODUCTS]: [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
  ],
  [ExportEntityType.REQUISITIONS]: [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ],
  [ExportEntityType.ORDERS]: [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ],
  [ExportEntityType.LOGS]: [PermissionType.OWNER, PermissionType.VIEW_LOGS],
  [ExportEntityType.SUPPLIERS]: [
    PermissionType.OWNER,
    PermissionType.MANAGE_SUPPLIERS,
  ],
};
