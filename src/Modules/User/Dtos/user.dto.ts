import { IsEmail, IsOptional, IsString } from "class-validator";
import { ProviderType, UserRole } from "../Enums/user.enum";

export class UserProfileDto {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_picture?: string;
  role: UserRole;
  provider: ProviderType;
  is_verified: boolean;
  last_login?: Date;
  verified_at?: Date;
  is_active: boolean;
}

export class UpdateUserProfileDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
