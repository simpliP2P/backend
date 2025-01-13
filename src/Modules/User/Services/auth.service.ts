import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { hash, compare } from "bcrypt";
import { User } from "../Entities/user.entity";
import { SignUpDto, loginDto } from "../Dtos/auth.dto";
import {
  InvalidCredentialsException,
} from "src/Shared/Exceptions/app.exceptions";
import { UserService } from "./user.service";
import { TokenHelper } from "src/Shared/Helpers/token.helper";
import { EmailServices } from "src/Modules/Mail/Services/mail.service";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { ProviderType } from "../Enums/user.enum";
import { TokenService } from "src/Modules/Token/Services/token.service";
import { TokenType } from "src/Modules/Token/Enums/token.enum";
import { Token } from "src/Modules/Token/Entities/token.entity";

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

    await this.userService.resetPasswordUsingVerifiedToken(verifiedToken, newPassword, oldPasswordHash);
  }

  private async findAccountByEmail(email: string) {
    return await this.userService.findAccount({
      where: { email },
    });
  }

  // private async findAccountByEmail(email: string, loadOrg: boolean) {
  // const relations = loadOrg ? ["organisation"] : [];

  // return await this.userService.findAccount({
  //   where: { email },
  //   relations: relations, // Conditionally load organisation
  // });

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
