import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../Entities/user.entity";
import { FindOneOptions, Repository } from "typeorm";
import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  BadRequestException,
  EmailExistsException,
  UserNotFoundException,
} from "src/Shared/Exceptions/app.exceptions";
import {
  CreateGoogleAccountInput,
  CreateLocalAccountInput,
} from "../Types/user.types";
import { FileManagerService } from "src/Modules/FileManager/Services/upload.service";
import { compare, hash } from "bcrypt";
import { Token } from "src/Modules/Token/Entities/token.entity";
import { ProviderType } from "../Enums/user.enum";
import { TokenService } from "src/Modules/Token/Services/token.service";
import { SanitizedUser } from "../Types/auth.types";
import { Request } from "express";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private fileManagerService: FileManagerService,
    private tokenService: TokenService,
  ) {}

  public async findAccount(query: FindOneOptions): Promise<User | null> {
    return await this.userRepository.findOne(query);
  }

  public async createLocalAccount(
    data: CreateLocalAccountInput,
  ): Promise<User> {
    const existingUser = await this.findAccount({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new EmailExistsException();
    }

    const hashedPassword = await hash(data.password, 12);

    const user = this.userRepository.create({
      ...data,
      password_hash: hashedPassword,
    });

    const createdAccount = await this.userRepository.save(user);
    return createdAccount;
  }

  public async createGoogleAccount(
    data: CreateGoogleAccountInput,
  ): Promise<User> {
    const existingUser = await this.findAccount({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new EmailExistsException();
    }

    const user = this.userRepository.create({
      ...data,
      password_hash: null,
    });

    return await this.userRepository.save(user);
  }

  public async updateAccount(
    userId: string,
    data: Partial<User>,
  ): Promise<SanitizedUser> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundException();
    }

    // Merge new data into the existing user object
    this.userRepository.merge(user, data);

    // Save the updated user
    const updatedUser = await this.userRepository.save(user);

    // Exclude password hash before returning
    const { password_hash, ...sanitizedUser } = updatedUser;

    return sanitizedUser;
  }

  public async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
    req: Request,
  ): Promise<string> {
    const user = await this.findAccount({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    // remove existing img from cloud
    if (user.profile_picture) {
      const existingKey = this.fileManagerService.extractFileKey(
        user.profile_picture,
      );
      const fileKey = await this.fileManagerService.uploadFile(
        file,
        existingKey,
      );

      const imageUrl = this.fileManagerService.constructUrl(fileKey, req);

      user.profile_picture = imageUrl;
      await this.userRepository.save(user);

      return imageUrl;
    }

    // Upload img to cloud
    const imageUrl = await this.fileManagerService.uploadFile(file);

    // Save the profile picture URL to the user entity in DB
    user.profile_picture = imageUrl;
    await this.userRepository.save(user);

    return imageUrl;
  }

  public async updateAccountUsingVerificationToken(
    verifiedToken: Token,
  ): Promise<void> {
    const user = await this.findAccount({
      where: { id: verifiedToken.user_id },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid verification token");
    }

    if (user.is_verified && user.verified_at) return;

    user.is_verified = true;
    user.verified_at = new Date();
    await this.userRepository.save(user);
  }

  public async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(
      {
        id: userId,
      },
      { last_login: new Date() },
    );
  }

  public async resetPasswordUsingVerifiedToken(
    verifiedToken: Token,
    newPassword: string,
    oldPasswordHash: string,
  ): Promise<void> {
    // Only allow password reset for local accounts
    if (verifiedToken.user.provider !== ProviderType.LOCAL) {
      throw new BadRequestException(
        "Password reset is not allowed for this account.",
      );
    }

    const hashedPassword = await hash(newPassword, 10);

    const isPasswordSame = await compare(newPassword, oldPasswordHash);
    if (isPasswordSame) {
      throw new UnprocessableEntityException("Cannot set to old password");
    }

    // Update user's password
    await this.userRepository.update(verifiedToken.user_id, {
      password_hash: hashedPassword,
    });

    // Delete used token
    await this.tokenService.delete(verifiedToken.id);
  }

  public async getUserProfile(userId: string): Promise<SanitizedUser> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["userOrganisations", "userOrganisations.organisation"],
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        profile_picture: true,
        userOrganisations: {
          id: true,
          role: true,
          is_creator: true,
          organisation: {
            id: true,
            name: true,
            logo: true,
          },
          permissions: true,
        },
      },
    });

    if (!user) {
      throw new UserNotFoundException();
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      profile_picture: user.profile_picture,
      user_organisations: user.userOrganisations.map((uo) => ({
        org_id: uo.organisation.id,
        name: uo.organisation.name,
        logo: uo.organisation.logo,
        role: uo.role,
        permissions: uo.permissions,
        is_creator: uo.is_creator,
      })),
    };
  }
}
