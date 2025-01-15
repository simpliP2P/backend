import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Organisation,
  UserOrganisation,
} from "../Entities/organisation.entity";
import { FindOneOptions, Repository } from "typeorm";
import {
  addUserToOrg,
  baseEmailInvitationData,
  CreateOrganisationInput,
} from "../Types/organisationTypes";
import { UserService } from "src/Modules/User/Services/user.service";
import { PermissionType } from "../Enums/userOrganisation.enum";
import { User } from "src/Modules/User/Entities/user.entity";
import {
  EmailExistsException,
  OrganisationExists,
  UserHasOrganisation,
  UserNotFoundException,
} from "src/Shared/Exceptions/app.exceptions";
import { EmailServices } from "src/Modules/Mail/Services/mail.service";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { TokenService } from "src/Modules/Token/Services/token.service";
import { TokenType } from "src/Modules/Token/Enums/token.enum";
import { AppLogger } from "src/Logger/logger.service";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
// import { PurchaseOrderService } from "src/Modules/PurchaseOrder/Services/purchaseOrder.service";
import { ProductService } from "src/Modules/Product/Services/product.service";

@Injectable()
export class OrganisationService {
  constructor(
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    @InjectRepository(UserOrganisation)
    private userOrganisationRepository: Repository<UserOrganisation>,
    private readonly userService: UserService,
    private readonly emailService: EmailServices,
    private readonly tokenService: TokenService,
    private readonly supplierService: SuppliersService,
    // private readonly purchaseOrderService: PurchaseOrderService,
    private readonly productService: ProductService,

    private readonly clientHelper: ClientHelper,
    private readonly logger: AppLogger,
  ) {}

  public async findOrganisation(
    query: FindOneOptions,
  ): Promise<Organisation | null> {
    return await this.organisationRepository.findOne(query);
  }

  async createOrganisation(
    createOrganisationInput: CreateOrganisationInput,
    creatorId: string,
  ): Promise<Organisation> {
    const { name, address, creator_role } = createOrganisationInput;

    let createdOrg: Organisation;

    try {
      const organisation = this.organisationRepository.create({
        name,
        address,
      });

      // Save the organisation to the db
      createdOrg = await this.organisationRepository.save(organisation);

      // Save the userOrganisation relation (creator is already validated implicitly)
      await this.userOrganisationRepository.save({
        user: { id: creatorId } as User,
        organisation: createdOrg,
        role: creator_role,
        permissions: [PermissionType.OWNER],
        is_creator: true,
      });
    } catch (error) {
      if (error.code === "23505") {
        throw new OrganisationExists(name);
      }

      if (error.message.includes("creator")) {
        throw new UserNotFoundException();
      }

      throw error;
    }

    return createdOrg;
  }

  async addUserToOrganisation(organisationId: string, data: addUserToOrg) {
    const { email, first_name, last_name, role, permissions } = data;

    let createdAccount: User | null = null;

    try {
      // Attempt to create the user account
      const password = this.generateStrongPassword();
      createdAccount = await this.userService.createLocalAccount({
        first_name,
        last_name,
        email,
        password,
      });
    } catch (error) {
      // Handle the email exists exception
      if (error instanceof EmailExistsException) {
        createdAccount = await this.userService.findAccount({
          where: { email },
        });

        // Check if the user is already associated with any organisation
        const existingAssociations = await this.userOrganisationRepository.find(
          {
            where: { user: { email } },
          },
        );

        if (existingAssociations.length > 0) {
          throw new UserHasOrganisation();
        }
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

  async acceptInvitation(data: {
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

    await this.userOrganisationRepository
      .createQueryBuilder()
      .update()
      .set({ accepted_invitation: true })
      .where("user_id = :userId", { userId: verifiedToken.user_id })
      .andWhere("organisation_id = :organisationId", { organisationId })
      .execute();

    await this.userService.resetPasswordUsingVerifiedToken(
      verifiedToken,
      newPassword,
      "", // not sending old password hash(edgecase: scenario where user password equals generated password)
    );
  }

  async getOrganisationMetrics(organisationId: string) {
    const totalSuppliers = await this.supplierService.count({
      where: { organisation: { id: organisationId } },
    });

    const totalProducts = await this.productService.count({
      where: { organisation: { id: organisationId } },
    });

    // const pendingPurchaseOrders = await this.purchaseOrderService.count({
    //   where: { organisation: { id: organisationId }, status: "PENDING" },
    // });

    return {
      organisationId,
      metrics: {
        totalSuppliers,
        totalProducts,
        pendingPurchaseOrders: 0,
      },
    };
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

  // for delete, implement a soft delete
}
