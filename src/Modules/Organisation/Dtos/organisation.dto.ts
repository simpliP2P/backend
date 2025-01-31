import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { PermissionType } from "../Enums/userOrganisation.enum";
import { Type } from "class-transformer";
import { PurchaseRequisitionStatus } from "src/Modules/PurchaseRequisition/Enums/purchaseRequisition.enum";

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

@ValidatorConstraint({ name: "AtLeastOne", async: false })
class AtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const object = args.object as Record<string, any>;
    return !!(object.role || object.permissions);
  }

  defaultMessage(args: ValidationArguments) {
    return `At least one of the following properties must be provided: ${args.constraints.join(", ")}`;
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

export class DeliveryTimeline {
  @IsDate()
  start_date: Date;

  @IsDate()
  end_date: Date;
}

export class CreatePurchaseRequisitionDto {
  @IsString()
  department: string;

  @IsEmail()
  contact_info: string;

  @IsString()
  requestor_name: string;

  @IsString()
  request_description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  estimated_cost: number;

  @IsString()
  justification: string;

  @IsObject()
  delivery_timeline: DeliveryTimeline;
}

/**
 * SAVE FOR LATER DTO
 */
export class SavePurchaseRequisitionDto extends CreatePurchaseRequisitionDto {
  @IsString()
  @IsEnum(PurchaseRequisitionStatus)
  status: PurchaseRequisitionStatus;
}
