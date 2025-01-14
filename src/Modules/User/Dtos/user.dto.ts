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
