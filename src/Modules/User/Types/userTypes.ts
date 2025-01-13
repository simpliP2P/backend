import {
  IsEmail,
  IsString,
  MinLength,
  IsBoolean,
  IsDate,
} from "class-validator";
import { ProviderType } from "../Enums/user.enum";

export class CreateLocalAccountInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}
export class CreateGoogleAccountInput {
  @IsString()
  @MinLength(3)
  first_name: string;

  @IsString()
  @MinLength(3)
  last_name: string;

  @IsEmail()
  email: string;

  provider: ProviderType;

  @IsBoolean()
  is_verified: boolean;

  @IsDate()
  verified_at: Date;
}

export interface ForgetCustomerPasswordInput {
  email: string;
}

export interface ResetCustomerPasswordInput {
  password: string;
  resetToken: string;
}
