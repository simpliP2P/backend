import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Organisation } from "../Entities/organisation.entity";
import { UserOrganisation } from "../Entities/user-organisation.entity";
import { FindOneOptions, Repository } from "typeorm";
import {
  addUserToOrg,
  baseEmailInvitationData,
  CreateOrganisationInput,
  updateUserDetails,
} from "../Types/organisation.types";
import { UserService } from "src/Modules/User/Services/user.service";
import { PermissionType } from "../Enums/user-organisation.enum";
import { User } from "src/Modules/User/Entities/user.entity";
import {
  // BadRequestException,
  EmailExistsException,
  OrganisationExists,
  // UserHasOrganisation,
  UserNotFoundException,
} from "src/Shared/Exceptions/app.exceptions";
import { EmailServices } from "src/Modules/Mail/Services/mail.service";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { TokenService } from "src/Modules/Token/Services/token.service";
import { TokenType } from "src/Modules/Token/Enums/token.enum";
import { AppLogger } from "src/Logger/logger.service";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import { ProductService } from "src/Modules/Product/Services/product.service";
import { FileManagerService } from "src/Modules/FileManager/Services/upload.service";
import { ConfigService } from "@nestjs/config";
import { AuditLogsService } from "src/Modules/AuditLogs/Services/audit-logs.service";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { OrganisationCategoryService } from "./organisation-category.service";
import { OrganisationDepartmentService } from "./organisation-department.service";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_DEPARTMENTS,
} from "../Enums/defaults.enum";
import { generateSubdomain } from "src/Shared/Helpers/subdomain.helper";
import { verifyReqSignature } from "src/Shared/Helpers/verify-req-signature";

@Injectable()
export class OrganisationService {
  private readonly clientSecretKey: string;

  constructor(
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,

    @InjectRepository(UserOrganisation)
    private userOrganisationRepository: Repository<UserOrganisation>,

    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,

    private readonly userService: UserService,
    private readonly emailService: EmailServices,
    private readonly tokenService: TokenService,
    private readonly supplierService: SuppliersService,
    private readonly productService: ProductService,
    private readonly fileManagerService: FileManagerService,
    private readonly clientHelper: ClientHelper,
    private readonly logger: AppLogger,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogsService,
    private readonly organisationCategoryService: OrganisationCategoryService,
    private readonly organisationDepartmentService: OrganisationDepartmentService,
  ) {
    this.clientSecretKey = this.configService.getOrThrow("appClientSK");
  }

  public async findOrganisation(
    query: FindOneOptions,
  ): Promise<Organisation | null> {
    return await this.organisationRepository.findOne(query);
  }

  public async createOrganisation(
    createOrganisationInput: CreateOrganisationInput,
    creatorId: string,
  ): Promise<Organisation> {
    const { name, address, creator_role } = createOrganisationInput;

    // Start a transaction
    return this.organisationRepository.manager.transaction(
      async (transactionalEntityManager) => {
        try {
          // Create the organisation entity
          const organisation = this.organisationRepository.create({
            name,
            address,
          });

          const subdomain = generateSubdomain(name);
          organisation.subdomain = subdomain;

          // Save the organisation to the db first
          const createdOrg = await transactionalEntityManager.save(
            Organisation,
            organisation,
          );

          /*
          // Generate and set the tenant_code
          const tenant_code = this.hashHelper.generateHashFromId(createdOrg.id);
          createdOrg.tenant_code = tenant_code;

          // Save the organisation again with the `tenant_code`
          await transactionalEntityManager.save(Organisation, createdOrg);
          */

          // Save the userOrganisation relation (creator is already validated implicitly)
          await transactionalEntityManager.save(UserOrganisation, {
            user: { id: creatorId } as User,
            organisation: createdOrg,
            role: creator_role,
            permissions: [PermissionType.OWNER],
            is_creator: true,
          });

          // Bulk insert default categories
          await this.organisationCategoryService.bulkCreateCategories(
            createdOrg.id,
            DEFAULT_CATEGORIES,
            transactionalEntityManager,
          );

          // Bulk insert default departments
          await this.organisationDepartmentService.bulkCreateDepartments(
            createdOrg.id,
            DEFAULT_DEPARTMENTS,
            transactionalEntityManager,
          );

          return createdOrg;
        } catch (error) {
          // Handle specific errors
          if (error.code === "23505") {
            throw new OrganisationExists(name);
          }

          if (error.message.includes("creator")) {
            throw new UserNotFoundException();
          }

          // Re-throw the error to trigger a rollback
          throw error;
        }
      },
    );
  }

  public async updateOrganisationDetails(
    organisationId: string,
    data: CreateOrganisationInput,
  ) {
    const organisation = await this.findOrganisation({
      where: { id: organisationId },
    });
    if (organisation) {
      Object.assign(organisation, data);
      return await this.organisationRepository.save(organisation);
    } else {
      throw new NotFoundException("Organisation not found");
    }
  }

  public async acceptInvitation(data: {
    token: string;
    organisationId: string;
    newPassword: string;
  }) {
    const { token, organisationId, newPassword } = data;

    const verifiedToken = await this.tokenService.verifyToken(
      token,
      TokenType.ORG_INVITATION,
    );

    await this.userService.updateAccountUsingVerificationToken(verifiedToken);

    await this.userOrganisationRepository.update(
      {
        user: { id: verifiedToken.user_id }, // Ensure this matches your entity relations
        organisation: { id: organisationId },
      },
      { accepted_invitation: true },
    );

    await this.userService.resetPasswordUsingVerifiedToken(
      verifiedToken,
      newPassword,
      "", // not sending old password hash(edgecase: scenario where user password equals generated password)
    );
  }

  public async uploadLogo(orgId: string, file: Express.Multer.File, req: any) {
    const org = await this.findOrganisation({ where: { id: orgId } });
    if (!org) {
      throw new Error("Organisation not found");
    }

    // FileManager img to cloud
    const imageUrl = await this.fileManagerService.uploadFile(file);

    // remove existing img from cloud
    if (org.logo) {
      const existingKey = this.fileManagerService.extractFileKey(org.logo);
      const fileKey = await this.fileManagerService.uploadFile(
        file,
        existingKey,
      );

      const imageUrl = this.fileManagerService.constructUrl(fileKey, req);

      org.logo = imageUrl;
      await this.organisationRepository.save(org);

      return imageUrl;
    }

    // Save the logo URL to the user entity in DB
    org.logo = imageUrl;
    await this.organisationRepository.save(org);

    return imageUrl;
  }

  public async getOrganisationMetrics(organisationId: string) {
    const totalSuppliers = await this.supplierService.count({
      where: { organisation: { id: organisationId } },
    });

    const totalProducts = await this.productService.count({
      where: { organisation: { id: organisationId } },
    });

    const pendingPurchaseOrders = await this.purchaseOrderRepository.count({
      where: { organisation: { id: organisationId }, status: "PENDING" },
    });

    return {
      organisationId,
      metrics: {
        totalSuppliers,
        totalProducts,
        pendingPurchaseOrders,
      },
    };
  }

  /**
   * Members Management
   */

  public async addMemberToOrganisation(
    organisationId: string,
    data: addUserToOrg,
  ) {
    const {
      email,
      first_name,
      last_name,
      role,
      permissions,
      branch_id,
      department_id,
    } = data;

    let createdAccount: User | null = null;

    try {
      // Attempt to create the user account
      const password = this.generateStrongPassword();

      createdAccount = await this.userService.createLocalAccount({
        first_name,
        last_name,
        email,
        password,
        branch: branch_id ? { id: branch_id } : undefined,
        department: department_id ? { id: department_id } : undefined,
      });
    } catch (error) {
      // Handle the email exists exception
      if (error instanceof EmailExistsException) {
        createdAccount = await this.userService.findAccount({
          where: { email },
        });

        /*
        // Check if the user is already associated with any organisation
        const existingAssociations = await this.userOrganisationRepository.find(
          {
            where: { user: { email } },
          },
        );

        if (existingAssociations.length > 0) {
          throw new UserHasOrganisation();
        }*/
      } else {
        throw error;
      }
    }

    if (!createdAccount) {
      throw new Error("Failed to create or find the user account.");
    }

    // Add the user to the organisation
    const userOrganisation = this.userOrganisationRepository.create({
      user: { id: createdAccount.id },
      organisation: { id: organisationId },
      role,
      permissions,
    });

    const createdRelation =
      await this.userOrganisationRepository.save(userOrganisation);

    // Fetch the saved entity and populate the relations in a single call.
    const savedRelationWithOrg = await this.userOrganisationRepository.findOne({
      where: { id: createdRelation.id },
      relations: ["organisation"], // Populate the related organisation
    });

    if (!savedRelationWithOrg) {
      throw new Error("Failed to fetch the saved relation with organisation.");
    }

    this.sendInvitationEmail(email, createdAccount.id, {
      firstName: first_name,
      role,
      organisationName:
        savedRelationWithOrg.organisation.name.toLocaleUpperCase(),
      organisationId: organisationId,
    }).catch((error) => {
      this.logger.error(`Error sending invitation email:`, error);
    });

    return createdRelation;
  }

  public async getOrganisationMembers(
    organisationId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize; // Calculate the offset

    // Fetch users associated with the organization
    const [userOrganisations, total] =
      await this.userOrganisationRepository.findAndCount({
        where: {
          organisation: { id: organisationId },
          is_creator: false,
        },
        take: _pageSize,
        skip,
        relations: ["user"],
      });

    // Map the results to return user details along with their roles and permissions
    const users = userOrganisations.map((userOrg) => ({
      id: userOrg.user.id,
      first_name: userOrg.user.first_name,
      last_name: userOrg.user.last_name,
      email: userOrg.user.email,
      phone: userOrg.user.phone,
      role: userOrg.role,
      permissions: userOrg.permissions,
      accepted_invitation: userOrg.accepted_invitation,
      profile_picture: userOrg.user.profile_picture,
      last_login: userOrg.user.last_login,
      online_status:
        userOrg.user.last_login &&
        this.onlineStatus(userOrg.user.last_login.toISOString()),
      deactivated_at: userOrg.deactivated_at,
    }));

    return {
      users,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  public async getOrganisationMember(organisationId: string, userId: string) {
    const member = await this.userOrganisationRepository.findOne({
      where: {
        organisation: { id: organisationId },
        user: { id: userId },
      },
      relations: ["user"],
      select: {
        user: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          profile_picture: true,
          last_login: true,
        },
      },
    });

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    const { user, ...otherDetails } = member;

    return {
      ...otherDetails,
      ...user,
      online_status:
        member.user.last_login &&
        this.onlineStatus(member.user.last_login.toISOString()),
    };
  }

  public async updateMemberDetails(
    userId: string,
    organisationId: string,
    data: updateUserDetails,
  ) {
    await this.userOrganisationRepository.update(
      { user: { id: userId }, organisation: { id: organisationId } },
      data,
    );
  }

  public async deactivateMember(
    userId: string,
    organisationId: string,
  ): Promise<void> {
    const updateResult = await this.userOrganisationRepository
      .createQueryBuilder()
      .update(UserOrganisation)
      .set({ deactivated_at: new Date() })
      .where("user_id = :userId AND organisation_id = :organisationId", {
        userId,
        organisationId,
      })
      .returning(
        `
        id, user_id, organisation_id, deactivated_at,
        (SELECT json_build_object('id', u.id, 'email', u.email)
        FROM users u
        WHERE u.id = user_id) AS user
      `,
      )
      .execute();

    if (updateResult.affected && updateResult.affected > 0) {
      await this.auditLogService.logUpdate(
        "user_organisations",
        userId,
        `Deactivated ${updateResult.raw[0].user_id.email}`,
        { deactivated_at: new Date() },
      );
    }
  }

  public async reactivateMember(
    userId: string,
    organisationId: string,
  ): Promise<void> {
    const updateResult = await this.userOrganisationRepository
      .createQueryBuilder()
      .update(UserOrganisation)
      .set({ deactivated_at: null })
      .where("user_id = :userId AND organisation_id = :organisationId", {
        userId,
        organisationId,
      })
      .returning(
        `
        id, user_id, organisation_id, deactivated_at,
        (SELECT json_build_object('id', u.id, 'email', u.email)
        FROM users u
        WHERE u.id = user_id) AS user
      `,
      )
      .execute();

    if (updateResult.affected && updateResult.affected > 0) {
      await this.auditLogService.logUpdate(
        "user_organisations",
        userId,
        `Reactivated ${updateResult.raw[0].user_id.email} account`,
        { deactivated_at: null },
      );
    }
  }

  public async removeMember(
    userId: string,
    organisationId: string,
  ): Promise<void> {
    await this.userOrganisationRepository.delete({
      user: { id: userId },
      organisation: { id: organisationId },
    });
  }

  public async verifyOrgSubdomain(
    subdomain: string,
    reqSignature: string,
    timestamp: string,
  ): Promise<{ name: string | null }> {
    verifyReqSignature(
      this.clientSecretKey,
      subdomain,
      reqSignature,
      timestamp,
    );

    const organisation = await this.organisationRepository.findOne({
      where: { subdomain },
      select: ["name"],
    });

    return { name: organisation?.name || null };
  }

  private generateStrongPassword(): string {
    const upperCaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerCaseLetters = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const specialCharacters = "!@#$%^&*()-_=+[]{}|;:,.<>?";

    const allCharacters =
      upperCaseLetters + lowerCaseLetters + numbers + specialCharacters;

    const getRandomCharacter = (characters: string) =>
      characters.charAt(Math.floor(Math.random() * characters.length));

    // Ensure at least one character from each category
    const password = [
      getRandomCharacter(upperCaseLetters),
      getRandomCharacter(lowerCaseLetters),
      getRandomCharacter(numbers),
      getRandomCharacter(specialCharacters),
    ];

    // Fill the remaining characters randomly to meet the minimum length
    while (password.length < 8) {
      password.push(getRandomCharacter(allCharacters));
    }

    // Shuffle the password to randomize the order
    return password.sort(() => Math.random() - 0.5).join("");
  }

  private async sendInvitationEmail(
    email: string,
    userId: string,
    data: baseEmailInvitationData,
  ) {
    const orgId = data.organisationId;
    const token = await this.tokenService.createToken(
      userId,
      TokenType.ORG_INVITATION,
      60, // 1 hour
    );
    const currentClientHost = this.clientHelper.getCurrentClient().landingPage;
    const invitationLink = `${currentClientHost}/organisation/${orgId}?invite=${token}`;

    await this.emailService.invitationEmail(email, {
      ...data,
      invitationLink,
    });
  }

  private onlineStatus(timestamp: string) {
    const now = new Date(); // Current time

    // Convert the timestamp to a Date object
    const timestampDate = new Date(timestamp);

    // Calculate the difference in milliseconds
    const differenceInMilliseconds = now.getTime() - timestampDate.getTime();

    // Convert the difference to minutes
    const differenceInMinutes = differenceInMilliseconds / (1000 * 60);

    const expiresIn = this.configService.get(
      "tokenSecrets.accessToken.expiresIn",
    );
    const match = expiresIn.match(/^(\d+)([a-zA-Z]+)$/);
    const number = parseInt(match[1], 10);

    return differenceInMinutes < number;
  }

  // for delete, implement a soft delete
}
