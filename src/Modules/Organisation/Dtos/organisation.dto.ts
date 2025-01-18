import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsString,
  Matches,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { PermissionType } from "../Enums/userOrganisation.enum";

export class CreateOrganisationDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(3)
  address: string;

  @IsString()
  @MinLength(2)
  creator_role: string;
}

@ValidatorConstraint({ name: "IsValidPermission", async: false })
class IsValidPermission implements ValidatorConstraintInterface {
  validate(permission: string, _args: ValidationArguments) {
    // Check if permission is not "all_permissions" and is a valid PermissionType
    return (
      permission !== "all_permissions" &&
      Object.values(PermissionType).includes(permission as PermissionType)
    );
  }

  defaultMessage(_args: ValidationArguments) {
    return "Each permission must be a valid PermissionType";
  }
}

export class updateUserDetailsDto {
  @IsString()
  @MinLength(2)
  role: string;

  @IsArray()
  @ArrayNotEmpty()
  @Validate(IsValidPermission, { each: true })
  permissions: string[];
}

export class addUserToOrgDto extends updateUserDetailsDto {
  @IsString()
  @MinLength(3)
  first_name: string;

  @IsString()
  @MinLength(3)
  last_name: string;

  @IsEmail()
  email: string;
}

export class acceptInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,}$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  })
  newPassword: string;
}