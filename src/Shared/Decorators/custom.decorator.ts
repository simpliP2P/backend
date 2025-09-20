import { SetMetadata } from "@nestjs/common";
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

export const Public = () => SetMetadata("isPublic", true);

export const Permissions = (...permissions: string[]) =>
  SetMetadata("permissions", permissions);

export function AtLeastOneField(
  excludeFields: string[] = [],
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "atLeastOneField",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const fields = Object.keys(obj).filter(
            (key) => !excludeFields.includes(key),
          );

          // Check if at least one field (other than excluded ones) has a truthy value
          return fields.some((field) => {
            const val = obj[field];
            return val !== null && val !== undefined && val !== "";
          });
        },
        defaultMessage(_args: ValidationArguments) {
          return `At least one field must be provided (excluding: ${excludeFields.join(", ")})`;
        },
      },
    });
  };
}
