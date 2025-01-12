import {
  IsString,
  MinLength,
} from "class-validator";

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
