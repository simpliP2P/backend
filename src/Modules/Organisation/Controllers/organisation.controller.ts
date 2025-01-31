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
  updateUserDetailsDto,
} from "../Dtos/organisation.dto";
import { Request } from "express";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/userOrganisation.enum";
import { Public } from "src/Shared/Decorators/custom.decorator";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from "src/Modules/Supplier/Dtos/supplier.dto";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchaseRequisition.entity";
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchaseRequisition.service";
import { PurchaseRequisitionStatus } from "src/Modules/PurchaseRequisition/Enums/purchaseRequisition.enum";
import { User } from "src/Modules/User/Entities/user.entity";
import { ProductService } from "src/Modules/Product/Services/product.service";
import {
  CreateProductDto,
  UpdateProductDto,
} from "src/Modules/Product/Dtos/product.dto";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { join } from "path";
import { existsSync, unlink } from "fs";
import { AppLogger } from "src/Logger/logger.service";
import { ApiResponse } from "src/Shared/Interfaces/api-response.interface";

@Controller("organisations")
export class OrganisationController {
  constructor(
    private readonly organisationService: OrganisationService,
    private readonly supplierService: SuppliersService,
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
    private readonly productService: ProductService,
    private readonly logger: AppLogger,
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
      storage: diskStorage({
        destination: "../../uploads",
        filename: (req, file, callback) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          callback(null, uniqueName);
        },
      }),
      limits: { fileSize: 0.1 * 1024 * 1024 }, // max: approx. 100MB
      fileFilter: (req, file, callback) => {
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
      );

      // Delete the local file after processing
      const filePath = join("../../uploads", file.filename);
      if (existsSync(filePath)) {
        unlink(filePath, (err) => {
          if (err) {
            this.logger.error("Error deleting file:", err.message);
          }
        });
      } else {
        this.logger.warn(`File not found for deletion: ${filePath}`);
      }

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
    PermissionType.MANAGE_USERS,
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
        data: { ...supplier },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/suppliers")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getAllSuppliers(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const { data, metadata } =
        await this.supplierService.findAllByOrganisation(
          organisationId,
          page,
          pageSize,
        );

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
    PermissionType.MANAGE_SUPPLIERS,
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
  @Post(":organisationId/requisitions")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async createRequisition(
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
          { ...data, created_by: { id: userId } as User },
        );

      return {
        status: "success",
        message: "Purchase requisition created successfully",
        data: purchaseRequisition,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/requisitions")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getRequisitions(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      const savedRequisitions =
        await this.purchaseRequisitionService.getAllPurchaseRequisitions(
          page,
          pageSize,
          userId,
          organisationId,
        );

      return {
        status: "success",
        message: "Requisitions fetched successfully.",
        data: { requisitions: savedRequisitions },
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(":organisationId/requisitions/saved")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
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

      if (data.status !== PurchaseRequisitionStatus.SAVED_FOR_LATER) {
        throw new BadRequestException("Invalid status");
      }

      const purchaseRequisition =
        await this.purchaseRequisitionService.createPurchaseRequisition(
          organisationId,
          { ...data, created_by: { id: userId } as User },
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
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getRequisitionById(
    @Param("organisationId") organisationId: string,
    @Param("requisitionId") requisitionId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      const requisition =
        await this.purchaseRequisitionService.getPurchaseRequisitionById(
          userId,
          organisationId,
          requisitionId,
        );

      return {
        status: "success",
        message: "Requisitions fetched successfully.",
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
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateApproval(
    @Param("id") requisitionId: string,
    @Req() req: Request,
    @Body()
    approvalData: {
      status: PurchaseRequisitionStatus;
      approval_justification: string;
    },
  ) {
    try {
      const userId = req.user.sub;

      await this.purchaseRequisitionService.updateApprovalDetails(
        requisitionId,
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
   * Products routes
   */
  @Post(":organisationId/products")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
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
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteProduct(
    @Param("organisationId") organisationId: string,
    @Param("productId") productId: string,
  ) {
    try {
      const updatedProduct =
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
