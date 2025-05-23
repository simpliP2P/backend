import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
} from "class-validator";
import { PermissionType } from "../Enums/user-organisation.enum";
import { Type } from "class-transformer";
import { Optional } from "@nestjs/common";

export class UpdateOrganisationDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(3)
  address: string;
}
export class CreateOrganisationDto extends UpdateOrganisationDto {
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
    return "Each permission must be a valid type";
  }
}

@ValidatorConstraint({ name: "AtLeastOne", async: false })
class AtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const object = args.object as Record<string, any>;
    return !!(object.role || object.permissions);
  }

  defaultMessage(args: ValidationArguments) {
    return `At least one of the following properties is required: ${args.constraints.join(", ")}`;
  }
}

export class updateUserDetailsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  role?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @Validate(IsValidPermission, { each: true })
  @Type(() => String)
  permissions?: string[];

  @Validate(AtLeastOneConstraint, ["role", "permissions"])
  _atLeastOne?: any;
}

export class addUserToOrgDto {
  @IsString()
  @MinLength(3)
  first_name: string;

  @IsString()
  @MinLength(3)
  last_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  role: string;

  @IsArray()
  @ArrayNotEmpty()
  @Validate(IsValidPermission, { each: true })
  permissions: string[];

  @IsUUID()
  @Optional()
  branch_id?: string;

  @IsUUID()
  @Optional()
  department_id?: string;
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

export class PurchaseItem {
  product_id?: string;
  pr_quantity?: number;
  unit_price?: number;
  item_name?: string;
  image_url?: string;
}

export function IsDateAtLeastToday(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "isDateAtLeastToday",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _: ValidationArguments) {
          // Convert the value to a Date object if it's a string
          const date = new Date(value);

          // Get today's date and set time to 00:00:00 for comparison
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Return false if the given date is earlier than today
          return date >= today;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} should be at least today's date`;
        },
      },
    });
  };
}
