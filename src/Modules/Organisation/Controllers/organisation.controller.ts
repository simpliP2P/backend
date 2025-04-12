import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { OrganisationService } from "../Services/organisation.service";
import {
  acceptInvitationDto,
  addUserToOrgDto,
  CreateOrganisationDto,
  CreatePurchaseRequisitionDto,
  UpdateOrganisationDto,
  updateUserDetailsDto,
} from "../Dtos/organisation.dto";
import { Request } from "express";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/user-organisation.enum";
import { Public } from "src/Shared/Decorators/custom.decorator";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from "src/Modules/Supplier/Dtos/supplier.dto";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchase-requisition.service";
import {
  PRApprovalActionType,
  PurchaseRequisitionStatus,
} from "src/Modules/PurchaseRequisition/Enums/purchase-requisition.enum";
import { User } from "src/Modules/User/Entities/user.entity";
import { ProductService } from "src/Modules/Product/Services/product.service";
import {
  CreateProductDto,
  UpdateProductDto,
} from "src/Modules/Product/Dtos/product.dto";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiResponse } from "src/Shared/Interfaces/api-response.interface";
import { AuditLogsService } from "src/Modules/AuditLogs/Services/audit-logs.service";
import { CreatePurchaseOrderDto } from "src/Modules/PurchaseOrder/Dtos/purchase-order.dto";
import { PurchaseOrderService } from "src/Modules/PurchaseOrder/Services/purchase-order.service";
import { OrganisationCategoryService } from "../Services/organisation-category.service";
import { OrganisationDepartment } from "../Entities/organisation-department.entity";
import { PurchaseOrderStatus } from "src/Modules/PurchaseOrder/Enums/purchase-order.enum";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";
import { OrganisationBranch } from "../Entities/organisation-branch.entity";

@Controller("organisations")
export class OrganisationController {
  constructor(
    private readonly organisationService: OrganisationService,
    private readonly organisationCategoryService: OrganisationCategoryService,
    private readonly supplierService: SuppliersService,
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
    private readonly productService: ProductService,
    private readonly auditLogsService: AuditLogsService,
    private readonly purchaseOrderService: PurchaseOrderService,
  ) {}

  @Post()
  async createOrganisation(
    @Body() createOrganisationDto: CreateOrganisationDto,
    @Req() req: Request,
  ) {
    try {
      const organisation = await this.organisationService.createOrganisation(
        createOrganisationDto,
        req.user.sub,
      );

      return {
        status: "success",
        message: "organisation created successfully",
        data: organisation,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getOrganisation(@Param("organisationId") organisationId: string) {
    try {
      const organisation = await this.organisationService.findOrganisation({
        where: { id: organisationId },
      });

      return {
        status: "success",
        message: "Organisation fetched successfully",
        data: organisation,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async updateOrganisation(
    @Param("organisationId") organisationId: string,
    @Body() data: UpdateOrganisationDto,
  ) {
    try {
      const organisation =
        await this.organisationService.updateOrganisationDetails(
          organisationId,
          data,
        );

      return {
        status: "success",
        message: "Organisation updated successfully",
        data: organisation,
      };
    } catch (error) {
      throw error;
    }
  }

  @Public()
  @Post(":organisationId/accept-invitation")
  async acceptInvitation(
    @Param("organisationId") organisationId: string,
    @Body() reqBody: acceptInvitationDto,
  ) {
    try {
      await this.organisationService.acceptInvitation({
        token: reqBody.token,
        organisationId: organisationId,
        newPassword: reqBody.newPassword,
      });

      return {
        status: "success",
        message: "You are now a member of the organisation",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/dashboard")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async dashboard(@Param("organisationId") organisationId: string) {
    try {
      const organisations =
        await this.organisationService.getOrganisationMetrics(organisationId);

      return {
        status: "success",
        message: "Metrics fetched successfully",
        data: organisations,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(":organisationId/logo")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 0.1 * 1024 * 1024 }, // max: approx. 100KB
      fileFilter: (_, file, callback) => {
        if (!file.mimetype.match(/image\/(jpeg|png|jpg)$/)) {
          return callback(new BadRequestException("Invalid file type"), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadLogo(
    @Param("organisationId") organisationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<ApiResponse<{ url: string }>> {
    try {
      if (!file) {
        throw new BadRequestException("No file uploaded");
      }

      const url = await this.organisationService.uploadLogo(
        organisationId,
        file,
        req,
      );

      return {
        status: "success",
        message: "logo uploaded successfully",
        data: { url },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Audit logs routes
   */
  @Get(":organisationId/audit-logs")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async getAuditLogs(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const data = await this.auditLogsService.getAllAuditLogsByOrganisation({
        organisationId,
        page,
        pageSize,
      });

      return {
        status: "success",
        message: "Audit logs fetched successfully",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/audit-logs/:userId")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getAuditLogsByUser(
    @Req() req: Request,
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const userId = req.user.sub;
      const data = await this.auditLogsService.getAllAuditLogsByUser(
        organisationId,
        userId,
        page,
        pageSize,
      );

      return {
        status: "success",
        message: "Audit logs fetched successfully",
        data: { data },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Category routes
   */
  @Post(":organisationId/categories")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async createCategory(
    @Param("organisationId") organisationId: string,
    @Body() data: { name: string },
  ) {
    try {
      const category = await this.organisationCategoryService.createCategory({
        organisationId: organisationId,
        name: data.name,
      });

      return {
        status: "success",
        message: "Category created successfully",
        data: category,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/categories")
  @SetMetadata("permissions", [PermissionType.OWNER, PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getCategories(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const data =
        await this.organisationCategoryService.getCategoriesByOrganisation(
          organisationId,
          page,
          pageSize,
        );

      return {
        status: "success",
        message: "Categories fetched successfully",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/categories/:categoryId")
  @SetMetadata("permissions", [PermissionType.OWNER, PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getCategoryById(
    @Param("organisationId") organisationId: string,
    @Param("categoryId") categoryId: string,
  ) {
    try {
      const category = await this.organisationCategoryService.getCategoryById(
        organisationId,
        categoryId,
      );

      return {
        status: "success",
        message: "Category fetched successfully",
        data: category,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId/categories/:categoryId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async editCategory(
    @Param("organisationId") organisationId: string,
    @Param("categoryId") categoryId: string,
    @Body() data: { name: string },
  ) {
    try {
      const category = await this.organisationCategoryService.editCategory(
        organisationId,
        categoryId,
        data,
      );

      return {
        status: "success",
        message: "Category updated successfully",
        data: category,
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/categories/:categoryId/deactivate")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async deactivateCategory(
    @Param("organisationId") organisationId: string,
    @Param("categoryId") categoryId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      await this.organisationCategoryService.deactivateCategory(
        userId,
        categoryId,
        organisationId,
      );

      return {
        status: "success",
        message: "Category deactivated successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/categories/:categoryId/reactivate")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async reactivateCategory(
    @Param("organisationId") organisationId: string,
    @Param("categoryId") categoryId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      await this.organisationCategoryService.reactivateCategory(
        userId,
        organisationId,
        categoryId,
      );

      return {
        status: "success",
        message: "Category reactivated successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Member routes
   */
  @Post(":organisationId/invite-member")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_USERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async addMemberToOrganisation(
    @Param("organisationId") organisationId: string,
    @Body() userData: addUserToOrgDto,
  ) {
    try {
      await this.organisationService.addMemberToOrganisation(
        organisationId,
        userData,
      );

      return {
        status: "success",
        message: "Invitation sent to user successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/members")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async getMembers(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const data = await this.organisationService.getOrganisationMembers(
        organisationId,
        page,
        pageSize,
      );

      return {
        status: "success",
        message: "Members fetched successfully",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/members/:memberId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async getMemberById(
    @Param("organisationId") organisationId: string,
    @Param("memberId") memberId: string,
  ) {
    try {
      const member = await this.organisationService.getOrganisationMember(
        organisationId,
        memberId,
      );

      return {
        status: "success",
        message: "Member fetched successfully",
        data: { member },
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/members/:memberId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async updateMemberDetails(
    @Param("organisationId") organisationId: string,
    @Param("memberId") userId: string,
    @Body() reqBody: updateUserDetailsDto,
  ) {
    try {
      const member = await this.organisationService.updateMemberDetails(
        userId,
        organisationId,
        reqBody,
      );

      return {
        status: "success",
        message: "Updated successfully",
        data: member,
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/members/:memberId/deactivate")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async deactivateMember(
    @Param("organisationId") organisationId: string,
    @Param("memberId") userId: string,
  ) {
    try {
      await this.organisationService.deactivateMember(userId, organisationId);

      return {
        status: "success",
        message: "Deactivated successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/members/:memberId/reactivate")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async reactivateMember(
    @Param("organisationId") organisationId: string,
    @Param("memberId") userId: string,
  ) {
    try {
      await this.organisationService.reactivateMember(userId, organisationId);

      return {
        status: "success",
        message: "Reactivated successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":organisationId/members/:memberId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async removeMember(
    @Param("organisationId") organisationId: string,
    @Param("memberId") userId: string,
  ) {
    try {
      await this.organisationService.removeMember(userId, organisationId);

      return {
        status: "success",
        message: "Removed successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supplier routes
   */
  @Post(":organisationId/suppliers")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    // PermissionType.MANAGE_USERS,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.CREATE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async addSupplierToOrganisation(
    @Param("organisationId") organisationId: string,
    @Body() reqBody: CreateSupplierDto,
  ) {
    try {
      const supplier = await this.supplierService.addSupplierToOrganisation(
        reqBody,
        organisationId,
      );

      return {
        status: "success",
        message: "Created supplier successfully",
        data: { supplier },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/suppliers")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.ORG_MEMBER,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.GET_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getAllSuppliers(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const { data, metadata } =
        await this.supplierService.findAllByOrganisation({
          organisationId,
          page,
          pageSize,
        });

      return {
        status: "success",
        message: "Suppliers fetched successfully",
        data,
        metadata,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/suppliers/:supplierId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.ORG_MEMBER,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.GET_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getSupplierById(
    @Param("organisationId") organisationId: string,
    @Param("supplierId") supplierId: string,
  ) {
    try {
      const supplier = await this.supplierService.findOneByOrganisation(
        supplierId,
        organisationId,
      );

      return {
        status: "success",
        message: "Supplier fetched successfully",
        data: supplier,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId/suppliers/:supplierId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.UPDATE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateSupplier(
    @Param("organisationId") organisationId: string,
    @Param("supplierId") supplierId: string,
    @Body() reqBody: UpdateSupplierDto,
  ) {
    try {
      const supplier = await this.supplierService.updateOrganisationSupplier(
        supplierId,
        organisationId,
        reqBody,
      );

      return {
        status: "success",
        message: "Supplier updated successfully",
        data: supplier,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":organisationId/suppliers/:supplierId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.DELETE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteSupplier(
    @Param("organisationId") organisationId: string,
    @Param("supplierId") supplierId: string,
  ) {
    try {
      await this.supplierService.removeSupplier(supplierId, organisationId);

      return {
        status: "success",
        message: "Supplier deleted successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Purchase Requisition routes
   */
  @Get(":organisationId/requisitions")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.GET_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getRequisitions(
    @Param("organisationId") organisationId: string,
    @Query("status") status: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    try {
      const isValidStatus =
        status &&
        Object.values(PurchaseRequisitionStatus).includes(
          status as PurchaseRequisitionStatus,
        );
      const isRestrictedStatus =
        status === PurchaseRequisitionStatus.SAVED_FOR_LATER ||
        status === PurchaseRequisitionStatus.INITIALIZED;

      if (isValidStatus && isRestrictedStatus) {
        throw new BadRequestException("Invalid status");
      }

      const data =
        await this.purchaseRequisitionService.getAllPurchaseRequisitions({
          organisationId,
          status: status as PurchaseRequisitionStatus,
          page,
          pageSize,
          startDate,
          endDate,
        });

      return {
        status: "success",
        message: "Requisitions fetched successfully.",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(":organisationId/requisitions/saved")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.CREATE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async saveForLater(
    @Param("organisationId") organisationId: string,
    @Body() data: CreatePurchaseRequisitionDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      if (!userId) return;

      const purchaseRequisition =
        await this.purchaseRequisitionService.createPurchaseRequisition(
          organisationId,
          {
            ...data,
            created_by: { id: userId } as User,
            department: { id: data.department_id } as OrganisationDepartment,
            supplier: { id: data.supplier_id } as Supplier,
            branch: { id: data.branch_id } as OrganisationBranch,
            status: PurchaseRequisitionStatus.SAVED_FOR_LATER,
          },
        );

      return {
        status: "success",
        message: "Purchase requisition saved successfully",
        data: { purchase_requisition: purchaseRequisition },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/requisitions/saved")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.GET_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getRequisitionsSavedForLater(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Req() req: Request,
  ): Promise<ApiResponse<{ requisitions: PurchaseRequisition[] }>> {
    try {
      const userId = req.user.sub;

      const savedRequisitions =
        await this.purchaseRequisitionService.getSavedPurchaseRequisitions(
          page,
          pageSize,
          userId,
          organisationId,
        );

      return {
        status: "success",
        message: "Saved requisitions fetched successfully.",
        data: { requisitions: savedRequisitions },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/requisitions/:requisitionId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.GET_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getRequisitionById(
    @Param("organisationId") organisationId: string,
    @Param("requisitionId") requisitionId: string,
  ) {
    try {
      const requisition =
        await this.purchaseRequisitionService.getPurchaseRequisitionById(
          organisationId,
          requisitionId,
        );

      return {
        status: "success",
        message: "Requisition fetched successfully.",
        data: { requisition },
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/requisitions/:id/approval")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.APPROVE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateApproval(
    @Param("organisationId") organisationId: string,
    @Param("id") requisitionId: string,
    @Req() req: Request,
    @Body()
    approvalData: {
      status: PurchaseRequisitionStatus;
      approval_justification: string;
      budget_id: string;
      action_type: PRApprovalActionType;
      supplier_id?: string;
    },
  ) {
    try {
      const userId = req.user.sub;

      await this.purchaseRequisitionService.updateApprovalDetails(
        requisitionId,
        organisationId,
        { ...approvalData, approved_by: userId },
      );

      return {
        status: "success",
        message: "Purchase requisition updated successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Purchase Order routes
   */
  @Post(":organisationId/orders")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.CREATE_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async createOrder(
    @Param("organisationId") organisationId: string,
    @Body() data: CreatePurchaseOrderDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      if (!userId) return;

      const order = await this.purchaseOrderService.create(organisationId, {
        ...data,
        created_by: { id: userId } as User,
      });

      return {
        status: "success",
        message: "Purchase order created successfully",
        data: order,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/orders")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.GET_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getOrders(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("status") status: PurchaseOrderStatus,
  ) {
    try {
      const orders = await this.purchaseOrderService.getOrganisationOrders({
        organisationId,
        page,
        pageSize,
        startDate,
        endDate,
        status,
      });

      return {
        status: "success",
        message: "Orders fetched successfully",
        data: orders,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/orders/:orderId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.GET_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getOrderById(
    @Param("organisationId") organisationId: string,
    @Param("orderId") orderId: string,
  ) {
    try {
      const order = await this.purchaseOrderService.getOrganisationOrderById(
        organisationId,
        orderId,
      );

      return {
        status: "success",
        message: "Order fetched successfully",
        data: { order },
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/orders/:orderId/status")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.UPDATE_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateOrderStatus(
    @Param("organisationId") organisationId: string,
    @Param("orderId") orderId: string,
    @Body() data: { status: PurchaseOrderStatus },
  ) {
    try {
      if (
        !Object.values(PurchaseOrderStatus).includes(data.status) ||
        data.status === PurchaseOrderStatus.PENDING
      ) {
        throw new BadRequestException("Invalid status");
      }

      const order = await this.purchaseOrderService.updateOrderStatus(
        organisationId,
        orderId,
        data.status,
      );

      return {
        status: "success",
        message: "Order status updated successfully",
        data: order,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Products routes
   */
  @Post(":organisationId/products")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
    PermissionType.CREATE_PRODUCTS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async createProduct(
    @Param("organisationId") organisationId: string,
    @Body() data: CreateProductDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      if (!userId) return;

      const createdProduct = await this.productService.addProductToOrganisation(
        organisationId,
        data,
      );

      return {
        status: "success",
        message: "Product created successfully",
        data: createdProduct,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/products")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getAllProducts(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const { data, metadata } =
        await this.productService.findAllProductsByOrganisation(
          organisationId,
          page,
          pageSize,
        );

      return {
        status: "success",
        message: "Products fetched successfully",
        data,
        metadata,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/products/:productId")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getProductById(
    @Param("organisationId") organisationId: string,
    @Param("productId") productId: string,
  ) {
    try {
      const product = await this.productService.findSingleOrganisationProduct(
        organisationId,
        productId,
      );

      return {
        status: "success",
        message: "Product fetched successfully",
        data: product,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId/products/:productId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
    PermissionType.UPDATE_PRODUCTS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateProduct(
    @Param("organisationId") organisationId: string,
    @Param("productId") productId: string,
    @Body() data: UpdateProductDto,
  ) {
    try {
      const updatedProduct =
        await this.productService.updateOrganisationProduct(
          organisationId,
          productId,
          data,
        );

      return {
        status: "success",
        message: "Product updated successfully",
        data: updatedProduct,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":organisationId/products/:productId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
    PermissionType.DELETE_PRODUCTS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteProduct(
    @Param("organisationId") organisationId: string,
    @Param("productId") productId: string,
  ) {
    try {
      await this.productService.deleteOrganisationProduct(
        organisationId,
        productId,
      );

      return {
        status: "success",
        message: "Product deleted successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }
}
