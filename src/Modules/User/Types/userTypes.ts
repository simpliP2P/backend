import {
  IsEmail,
  IsString,
  MinLength,
  IsBoolean,
  IsDate,
} from "class-validator";
import { ProviderType } from "../Enums/user.enum";

export class CreateGoogleAccountInput {
  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  lastName: string;

  @IsEmail()
  email: string;

  provider: ProviderType;

  @IsBoolean()
  isVerified: boolean;

  @IsDate()
  verifiedAt: Date;
}

export interface ForgetCustomerPasswordInput {
  email: string;
}

export interface ResetCustomerPasswordInput {
  password: string;
  resetToken: string;
}
