import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  SetMetadata,
  UseGuards,
  ForbiddenException,
  Body,
} from "@nestjs/common";
import { ExportService } from "../Services/export.service";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchase-requisition.service";
import { Request, Response } from "express";
import { ExportEntityType, ExportFileType } from "../Enums/export.enum";
import { ExportHelper } from "src/Shared/Helpers/export.helper";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { PurchaseOrderService } from "src/Modules/PurchaseOrder/Services/purchase-order.service";
import { AuditLogsService } from "src/Modules/AuditLogs/Services/audit-logs.service";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import {
  flattenArrayWithoutId,
  flattenArrayWithoutIdEnhanced,
} from "src/Shared/Helpers/flatten-json.helper";
import { ProductService } from "src/Modules/Product/Services/product.service";
import { ExportQueryDto, ExportSelectedDto } from "../Dtos/export.dto";
import { ExportEntityPermissionMap } from "../Constants/export.constants";

@Controller("organisations/:organisationId/export")
export class ExportController {
  private readonly DATA_THRESHOLD = 1000;

  constructor(
    private readonly exportService: ExportService,
    private readonly exportHelper: ExportHelper,
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly auditlogService: AuditLogsService,
    private readonly supplierService: SuppliersService,
    private readonly productService: ProductService,
  ) {}

  @Get("requisitions")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  public async exportRequisitions(
    @Query() query: ExportQueryDto,
    @Param("organisationId") organisationId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { format, startDate, endDate } = query;

    const userId = req.user.sub;
    const fileName = `requisitions-${startDate}-${endDate}`;

    const { requisitions } =
      await this.purchaseRequisitionService.getAllPurchaseRequisitions({
        organisationId,
        startDate,
        endDate,
        exportAll: true,
      });

    // Remove `id` field from each requisition
    const sanitizedRequisitions = requisitions.map(({ id, ...rest }) => rest);
    const data = flattenArrayWithoutIdEnhanced(sanitizedRequisitions);

    if (data.length === 0) {
      throw new BadRequestException("No requisitions found");
    }

    switch (format) {
      case ExportFileType.CSV:
        if (requisitions.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            data,
            ExportFileType.CSV,
          );

          return res.json({
            status: "success",
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return this.exportHelper.exportCSV(fileName, data, res);
      case ExportFileType.EXCEL:
        if (requisitions.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            data,
            ExportFileType.EXCEL,
          );

          return res.json({
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return await this.exportHelper.exportExcel(fileName, data, res);
      default:
        throw new BadRequestException("Invalid export format");
    }
  }

  @Get("orders")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  public async exportOrders(
    @Query() query: ExportQueryDto,
    @Param("organisationId") organisationId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { format, startDate, endDate } = query;

    const userId = req.user.sub;
    const fileName = `orders-${startDate}-${endDate}`;

    const { orders } = await this.purchaseOrderService.getOrganisationOrders({
      organisationId,
      startDate,
      endDate,
      exportAll: true,
    });

    // Remove `id` field from each order
    const sanitizedOrders = orders.map(({ id, ...rest }) => rest);
    const data = flattenArrayWithoutId(sanitizedOrders);

    if (data.length === 0) {
      throw new BadRequestException("No orders found");
    }

    switch (format) {
      case ExportFileType.CSV:
        if (orders.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            data,
            ExportFileType.CSV,
          );

          return res.json({
            status: "success",
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return this.exportHelper.exportCSV(fileName, data, res);
      case ExportFileType.EXCEL:
        if (orders.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            data,
            ExportFileType.EXCEL,
          );

          return res.json({
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return await this.exportHelper.exportExcel(fileName, data, res);

      default:
        throw new BadRequestException("Invalid export format");
    }
  }

  @Get("logs")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  public async exportAuditLogs(
    @Param("organisationId") organisationId: string,
    @Query() query: ExportQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { format, startDate, endDate } = query;

    const userId = req.user.sub;
    const fileName = `logs-${startDate}-${endDate}`;

    const { logs } = await this.auditlogService.getAllAuditLogsByOrganisation({
      organisationId,
      page: 1,
      pageSize: this.DATA_THRESHOLD,
      startDate,
      endDate,
      exportAll: true,
    });

    // Remove `id` field from each order
    const _logs = logs.map(({ id, ...rest }) => rest);
    const data = flattenArrayWithoutId(_logs);

    if (data.length === 0) {
      throw new BadRequestException("No logs found");
    }

    switch (format) {
      case ExportFileType.CSV:
        if (logs.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            data,
            ExportFileType.CSV,
          );

          return res.json({
            status: "success",
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return this.exportHelper.exportCSV(fileName, data, res);
      case ExportFileType.EXCEL:
        if (logs.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            data,
            ExportFileType.EXCEL,
          );

          return res.json({
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return await this.exportHelper.exportExcel(fileName, data, res);

      default:
        throw new BadRequestException("Invalid export format");
    }
  }

  @Get("suppliers")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  public async exportSuppliers(
    @Param("organisationId") organisationId: string,
    @Query() query: ExportQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { format, startDate, endDate } = query;

    const userId = req.user.sub;
    const fileName = `suppliers-${startDate}-${endDate}`;

    const { data: suppliers } =
      await this.supplierService.findAllByOrganisation({
        organisationId,
        page: 1,
        pageSize: this.DATA_THRESHOLD,
        startDate,
        endDate,
        exportAll: true,
      });

    const data = flattenArrayWithoutId(suppliers);

    if (suppliers.length === 0) {
      throw new BadRequestException("No suppliers found");
    }

    switch (format) {
      case ExportFileType.CSV:
        if (suppliers.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            data,
            ExportFileType.CSV,
          );

          return res.json({
            status: "success",
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return this.exportHelper.exportCSV(fileName, data, res);
      case ExportFileType.EXCEL:
        if (suppliers.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            data,
            ExportFileType.EXCEL,
          );

          return res.json({
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return await this.exportHelper.exportExcel(fileName, data, res);

      default:
        throw new BadRequestException("Invalid export format");
    }
  }

  @Get("products")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  public async exportProducts(
    @Param("organisationId") organisationId: string,
    @Query() query: ExportQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { format, startDate, endDate } = query;

    const userId = req.user.sub;
    const fileName =
      startDate && endDate ? `products-${startDate}-${endDate}` : "products";

    const { data: products } =
      await this.productService.findAllProductsByOrganisation({
        organisationId,
        page: 1,
        pageSize: this.DATA_THRESHOLD,
        startDate,
        endDate,
        exportAll: true,
      });

    if (!products.length) {
      throw new BadRequestException("No products found");
    }

    const data = flattenArrayWithoutId(products);
    const shouldQueue = products.length > this.DATA_THRESHOLD;

    if (shouldQueue) {
      await this.exportService.addExportJob(userId, data, format);
      return res.json({
        status: "success",
        message:
          "Your export is being processed. You will be notified when it's ready.",
      });
    }

    switch (format) {
      case ExportFileType.CSV:
        return this.exportHelper.exportCSV(fileName, data, res);
      case ExportFileType.EXCEL:
        return this.exportHelper.exportExcel(fileName, data, res);
      default:
        // Defensive fallback: should never reach here
        throw new BadRequestException("Unsupported export format");
    }
  }

  @Post("selected")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.MANAGE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  public async exportSelected(
    @Body() body: ExportSelectedDto,
    @Req() req: Request,
    @Res() res: Response,
    @Param("organisationId") organisationId: string,
  ) {
    const { entity, format, ids } = body;
    const userId = req.user.sub;
    const userPermissions = req.user.permissions;

    const allowedPermissions = ExportEntityPermissionMap[entity];
    const hasPermission = allowedPermissions.some((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to export ${entity}s`,
      );
    }

    const fileName = `${entity}-selected-${Date.now()}`;
    let data: any[] = [];
    let queryData = { organisationId, ids };

    switch (entity) {
      case ExportEntityType.REQUISITIONS:
        data =
          await this.purchaseRequisitionService.findOrgPurchaseRequisitionsByIds(
            queryData,
          );
        break;
      case ExportEntityType.ORDERS:
        data =
          await this.purchaseOrderService.findOrgPurchaseOrdersByIds(queryData);
        break;
      case ExportEntityType.LOGS:
        data = await this.auditlogService.findOrgLogsByIds(queryData);
        break;
      case ExportEntityType.SUPPLIERS:
        data = await this.supplierService.findOrgSuppliersByIds(queryData);
        break;
      case ExportEntityType.PRODUCTS:
        data = await this.productService.findOrgProductsByIds(queryData);
        break;
      default:
        throw new BadRequestException("Unsupported export entity type");
    }

    if (!data.length) {
      throw new BadRequestException(`No ${entity} found for the provided IDs`);
    }

    const flattened = flattenArrayWithoutId(data);
    const shouldQueue = flattened.length > this.DATA_THRESHOLD;

    if (shouldQueue) {
      await this.exportService.addExportJob(userId, flattened, format);
      return res.json({
        status: "success",
        message:
          "Your export is being processed. You will be notified when it's ready.",
      });
    }

    switch (format) {
      case ExportFileType.CSV:
        return this.exportHelper.exportCSV(fileName, flattened, res);
      case ExportFileType.EXCEL:
        return this.exportHelper.exportExcel(fileName, flattened, res);
      default:
        throw new BadRequestException("Unsupported export format");
    }
  }
}
