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
import { EmailExistsException } from "src/Shared/Exceptions/app.exceptions";
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
      password: hashedPassword,
    });
    user.tokenGeneratedAt = new Date();
    user.provider = ProviderType.LOCAL;

    const createdAccount = await this.userRepository.save(user);

    // generate verification token
    const verificationToken = this.tokenHelper.generateVerificationToken({
      id: createdAccount.id,
      purpose: "verify-account",
    });

    const currentClientHost = this.clientHelper.getCurrentClient().landingPage;
    const verificationLink = `${currentClientHost}/auth/verify-account/${verificationToken}`;

    // Send email verification mail
    await this.emailService.sendVerificationEmail(
      signUpDto.firstName,
      signUpDto.email,
      verificationLink,
    );
  }

  public async login(signInDto: loginDto) {
    const user = await this.findAccountByEmail(signInDto.email);

    if (!user?.isVerified) {
      throw new UnprocessableEntityException("Account not verified");
    }

    if (
      !user ||
      !user.password ||
      !(await compare(signInDto.password, user.password))
    ) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = { sub: user.id };
    return {
      // access token
      token: this.tokenHelper.generateAccessToken(payload),
      user: { ...user, password: undefined },
    };
  }

  public async verifyEmail(token: string): Promise<void> {
    const { id } = this.tokenHelper.verifyVerificationToken(token);

    const user = await this.userService.findAccount({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid verification token");
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    user.tokenGeneratedAt = null;
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

    console.log(resetLink);
    // await this.emailService.sendResetPasswordEmail(
    //   user.firstName,
    //   user.email,
    //   resetLink,
    // );
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

    const oldPasswordHash = verifiedToken.user.password;
    if (!oldPasswordHash) {
      throw new UnprocessableEntityException("");
    }

    const hashedPassword = await hash(newPassword, 10);

    const isPasswordSame = await compare(newPassword, oldPasswordHash);
    if (isPasswordSame) {
      throw new UnprocessableEntityException("Cannot set to old password");
    }

    // Update user's password
    await this.userRepository.update(verifiedToken.userId, {
      password: hashedPassword,
    });

    // Delete used token
    await this.tokenService.delete(verifiedToken.id);
  }

  private async findAccountByEmail(email: string) {
    return await this.userService.findAccount({
      where: { email },
    });
  }
}
