import { IsString } from "class-validator";

export class HandleCustomerGoogleLoginCallbackInput {
  @IsString()
  code: string;
}
