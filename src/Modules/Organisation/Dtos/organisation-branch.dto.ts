import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateBranchDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  address: string;
}
