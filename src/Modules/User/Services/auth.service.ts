import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { compare } from "bcrypt";
import { User } from "../Entities/user.entity";
import { SignUpDto, loginDto } from "../Dtos/auth.dto";
import { InvalidCredentialsException } from "src/Shared/Exceptions/app.exceptions";
import { UserService } from "./user.service";
import { TokenHelper } from "src/Shared/Helpers/token.helper";
import { EmailServices } from "src/Modules/Mail/Services/mail.service";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { ProviderType } from "../Enums/user.enum";
import { TokenService } from "src/Modules/Token/Services/token.service";
import { TokenType } from "src/Modules/Token/Enums/token.enum";
import { createHash, randomUUID } from "crypto";
import { Request } from "express";
import { Repository } from "typeorm";
import { AppLogger } from "src/Logger/logger.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userService: UserService,
    private tokenHelper: TokenHelper,
    private emailService: EmailServices,
    private clientHelper: ClientHelper,
    private tokenService: TokenService,
    private logger: AppLogger,
  ) {
  }

  public async signUp(signUpDto: SignUpDto): Promise<void> {
    const createdAccount = await this.userService.createLocalAccount(signUpDto);

    const verificationToken = await this.tokenService.createToken(
      createdAccount.id,
      TokenType.EMAIL_VERIFICATION,
    );

    const currentClientHost = this.clientHelper.getCurrentClient().landingPage;
    const verificationLink = `${currentClientHost}/auth/verify-account/${verificationToken}`;

    await this.emailService.sendVerificationEmail(
      signUpDto.first_name,
      signUpDto.email,
      verificationLink,
    );
  }

  public async login(
    loginDto: loginDto,
  ): Promise<{ token: string; user: Partial<User> }> {
    // Find and validate user
    const user = await this.findAccountByEmail(loginDto.email);

    const validatedUser = await this.validateUserStatus(user);

    await this.verifyPassword(loginDto.password, validatedUser.password_hash);

    this.userRepository
      .update(
        {
          id: validatedUser.id,
        },
        { last_login: new Date() },
      )
      .catch((error) => {
        this.logger.error(
          `Unable to update last login of userId: ${validatedUser.id}`,
          error,
        );
      });

    return this.generateLoginResponse(validatedUser);
  }

  public async verifyEmail(token: string): Promise<void> {
    const verifiedToken = await this.tokenService.verifyToken(
      token,
      TokenType.EMAIL_VERIFICATION,
    );

    await this.userService.updateAccountUsingVerificationToken(verifiedToken);
  }

  public async initiateResetPassword(email: string): Promise<void> {
    const user = await this.findAccountByEmail(email);
    if (!user) return; // Silent fail for security

    const resetToken = await this.tokenService.createToken(
      user.id,
      TokenType.PASSWORD_RESET,
    );

    const currentClientHost = this.clientHelper.getCurrentClient().landingPage;
    const resetLink = `${currentClientHost}/auth/reset-password?token=${resetToken}`;

    await this.emailService.sendResetPasswordEmail(
      user.first_name,
      user.email,
      resetLink,
    );
  }

  public async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    // Verify token and get associated user
    const verifiedToken = await this.tokenService.verifyToken(
      token,
      TokenType.PASSWORD_RESET,
    );

    const oldPasswordHash = verifiedToken.user.password_hash;
    if (!oldPasswordHash) {
      throw new UnprocessableEntityException("");
    }

    await this.userService.resetPasswordUsingVerifiedToken(
      verifiedToken,
      newPassword,
      oldPasswordHash,
    );
  }

  /*
  public async generateTokens(user: User, req: Request) {
    // Generate access token with short lifespan
    const accessToken = this.tokenHelper.generateAccessToken({
      sub: user.id,
    });

    // Generate refresh token
    const deviceFingerprint = this.generateDeviceFingerprint(req);
    const familyId = randomUUID();

    const refreshToken = await this.tokenService.save({
      token: randomUUID(),
      type: TokenType.REFRESH_TOKEN,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      user_id: user.id,
      meta_data: {
        tokenFamily: familyId,
        deviceId: deviceFingerprint,
        userAgent: req.headers["user-agent"],
        fingerprint: deviceFingerprint,
        lastIpAddress: req.ip,
        previousTokenId: null, // First token in family
        used: false,
      },
    });

    return {
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  public async logout(refreshToken: string) {
    const tokenDoc = await this.tokenService.findToken({
      where: { token: refreshToken },
    });

    if (tokenDoc) {
      // Delete the token immediately rather than just invalidating
      await this.tokenService.delete(tokenDoc.id);
    }
  }

  public async logoutAll(userId: string) {
    // Delete all refresh tokens for user
    await this.tokenService.delete({ userId });
  }

  public async invalidateTokenFamily(familyId: string) {
    // Delete all tokens in the family
    await this.tokenService.delete({ tokenFamily: familyId });
  }*/

  private async findAccountByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
      relations: ["userOrganisations"],
    });
  }

  private sanitizeUser(user: User): Partial<User> {
    const { password_hash, created_at, updated_at, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private async validateUserStatus(user: User | null): Promise<User> {
    if (!user) {
      // same error message as invalid password to prevent user enumeration
      throw new InvalidCredentialsException();
    }

    if (!user.is_verified) {
      throw new UnprocessableEntityException("Account not verified");
    }

    if (user.provider !== ProviderType.LOCAL) {
      throw new UnauthorizedException(`Please login using ${user.provider}`);
    }

    return user;
  }

  private async verifyPassword(
    password: string,
    passwordHash: string | null,
  ): Promise<void> {
    if (!passwordHash || !(await compare(password, passwordHash))) {
      throw new InvalidCredentialsException();
    }
  }

  private generateLoginResponse(user: User): {
    token: string;
    user: Partial<User>;
  } {
    const payload = {
      sub: user.id,
      // org_sub: orgId,
    };

    return {
      token: this.tokenHelper.generateAccessToken(payload),
      user: this.sanitizeUser(user),
    };
  }
/*
  private generateDeviceFingerprint(req: Request): string {
    const factors = [
      req.headers["user-agent"],
      req.headers["accept-language"],
      req.ip,
    ];

    return createHash("sha256").update(factors.join("|")).digest("hex");
  }*/
}
