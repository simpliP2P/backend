import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { hash, compare } from "bcrypt";
import { User } from "../Entities/user.entity";
import { SignUpDto, loginDto } from "../Dtos/auth.dto";
import {
  EmailExistsException,
  InvalidCredentialsException,
} from "src/Shared/Exceptions/app.exceptions";
import { UserService } from "./user.service";
import { TokenHelper } from "src/Shared/Helpers/token.helper";
import { EmailServices } from "src/Modules/Mail/Services/mail.service";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { ProviderType } from "../Enums/user.enum";
import { TokenService } from "src/Modules/Token/Services/token.service";
import { TokenType } from "src/Modules/Token/Enums/token.enum";

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
  ) {}

  public async signUp(signUpDto: SignUpDto): Promise<void> {
    const existingUser = await this.findAccountByEmail(signUpDto.email);

    if (existingUser) {
      throw new EmailExistsException();
    }

    const hashedPassword = await hash(signUpDto.password, 12);

    const user = this.userRepository.create({
      ...signUpDto,
      password_hash: hashedPassword,
    });
    user.provider = ProviderType.LOCAL;

    const createdAccount = await this.userRepository.save(user);

    const verificationToken = await this.tokenService.createToken(
      createdAccount.id,
      TokenType.EMAIL_VERIFICATION,
    );

    const currentClientHost = this.clientHelper.getCurrentClient().landingPage;
    const verificationLink = `${currentClientHost}/auth/verify-account/${verificationToken}`;

    console.log("Verification link:", verificationLink);
    // Send email verification mail
    // await this.emailService.sendVerificationEmail(
    //   signUpDto.first_name,
    //   signUpDto.email,
    //   verificationLink,
    // );
  }

  public async login(
    loginDto: loginDto,
  ): Promise<{ token: string; user: Partial<User> }> {
    // Find and validate user
    const user = await this.findAccountByEmail(loginDto.email);
    const validatedUser = await this.validateUserStatus(user);

    await this.verifyPassword(loginDto.password, validatedUser.password_hash);

    return this.generateLoginResponse(validatedUser);
  }

  public async verifyEmail(token: string): Promise<void> {
    const verifiedToken = await this.tokenService.verifyToken(token, TokenType.EMAIL_VERIFICATION)

    const user = await this.userService.findAccount({
      where: { id: verifiedToken.user_id },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid verification token");
    }

    user.is_verified = true;
    user.verified_at = new Date();
    await this.userRepository.save(user);
  }

  public async forgotPassword(email: string): Promise<void> {
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

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Verify token and get associated user
    const verifiedToken = await this.tokenService.verifyToken(
      token,
      TokenType.PASSWORD_RESET,
    );

    // Only allow password reset for local accounts
    if (verifiedToken.user.provider !== ProviderType.LOCAL) {
      throw new BadRequestException(
        "Password reset is not allowed for this account.",
      );
    }

    const oldPasswordHash = verifiedToken.user.password_hash;
    if (!oldPasswordHash) {
      throw new UnprocessableEntityException("");
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

  private async findAccountByEmail(email: string) {
    return await this.userService.findAccount({
      where: { email },
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
    };

    return {
      token: this.tokenHelper.generateAccessToken(payload),
      user: this.sanitizeUser(user),
    };
  }
}
