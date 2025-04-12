import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { ExportService } from "../Services/export.service";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchase-requisition.service";
import { Request, Response } from "express";
import { ExportFileType } from "../Enums/export.enum";
import { ExportHelper } from "src/Shared/Helpers/export.helper";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { PurchaseOrderService } from "src/Modules/PurchaseOrder/Services/purchase-order.service";
import { AuditLogsService } from "src/Modules/AuditLogs/Services/audit-logs.service";

@Controller("organisations/:organisationId/export")
export class ExportController {
  private readonly DATA_THRESHOLD = 1000;

  constructor(
    private readonly exportService: ExportService,
    private readonly exportHelper: ExportHelper,
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly auditlogService: AuditLogsService,
  ) {}

  @Get("requisitions")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async exportRequisitions(
    @Param("organisationId") organisationId: string,
    @Query("format") format: ExportFileType,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!format || !startDate || !endDate) {
      throw new BadRequestException("Missing required query parameters");
    }

    const userId = req.user.sub;
    const fileName = `requisitions-${startDate}-${endDate}`;

    const { requisitions  } =
      await this.purchaseRequisitionService.getAllPurchaseRequisitions({
        organisationId,
        startDate,
        endDate,
        exportAll: true,
      });

    // Remove `id` field from each requisition
    const sanitizedRequisitions = requisitions.map(({ id, ...rest }) => rest);

    if (sanitizedRequisitions.length === 0) {
      throw new BadRequestException("No requisitions found");
    }

    switch (format) {
      case ExportFileType.CSV:
        if (requisitions.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            sanitizedRequisitions,
            ExportFileType.CSV,
          );

          return res.json({
            status: "success",
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return this.exportHelper.exportCSV(
          fileName,
          sanitizedRequisitions,
          res,
        );
      case ExportFileType.EXCEL:
        if (requisitions.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            sanitizedRequisitions,
            ExportFileType.EXCEL,
          );

          return res.json({
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return await this.exportHelper.exportExcel(
          fileName,
          sanitizedRequisitions,
          res,
        );
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
  async exportOrders(
    @Param("organisationId") organisationId: string,
    @Query("format") format: ExportFileType,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!format || !startDate || !endDate) {
      throw new BadRequestException("Missing required query parameters");
    }

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

    if (sanitizedOrders.length === 0) {
      throw new BadRequestException("No orders found");
    }

    switch (format) {
      case ExportFileType.CSV:
        if (orders.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            sanitizedOrders,
            ExportFileType.CSV,
          );

          return res.json({
            status: "success",
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return this.exportHelper.exportCSV(fileName, sanitizedOrders, res);
      case ExportFileType.EXCEL:
        if (orders.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            sanitizedOrders,
            ExportFileType.EXCEL,
          );

          return res.json({
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return await this.exportHelper.exportExcel(
          fileName,
          sanitizedOrders,
          res,
        );

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
  async exportAuditLogs(
    @Param("organisationId") organisationId: string,
    @Query("format") format: ExportFileType,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!format || !startDate || !endDate) {
      throw new BadRequestException("Missing required query parameters");
    }

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
    const sanitizedLogs = logs.map(({ id, ...rest }) => rest);

    if (sanitizedLogs.length === 0) {
      throw new BadRequestException("No logs found");
    }

    switch (format) {
      case ExportFileType.CSV:
        if (logs.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            sanitizedLogs,
            ExportFileType.CSV,
          );

          return res.json({
            status: "success",
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return this.exportHelper.exportCSV(fileName, sanitizedLogs, res);
      case ExportFileType.EXCEL:
        if (logs.length > this.DATA_THRESHOLD) {
          await this.exportService.addExportJob(
            userId,
            sanitizedLogs,
            ExportFileType.EXCEL,
          );

          return res.json({
            message:
              "Your export is being processed. You will be notified when it's ready.",
          });
        }

        return await this.exportHelper.exportExcel(
          fileName,
          sanitizedLogs,
          res,
        );

      default:
        throw new BadRequestException("Invalid export format");
    }
  }
}
