import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  IsBoolean,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SignUpDto {
  @ApiProperty({
    description: "The first name of the user",
    type: String,
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  first_name: string;

  @ApiProperty({
    description: "The last name of the user",
    type: String,
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  last_name: string;

  @ApiProperty({
    description: "The email address of the user",
    type: String,
    format: "email",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      "The password of the user (must contain at least one uppercase letter, one lowercase letter, one number, and one special character)",
    type: String,
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,}$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  })
  password: string;

  @ApiProperty({
    description: "The logo of the organisation",
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  profile_picture: string;

  @ApiProperty({
    description: "The phone number of the user",
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  phone: string;

  @ApiProperty({
    description: "Indicates whether the user is verified or not",
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_verified: boolean;
}

export class loginDto {
  @ApiProperty({
    description: "The email address of the user",
    type: String,
    format: "email",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "The password of the user",
    type: String,
  })
  @IsString()
  password: string;
}

export class verifyEmailDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  token: string;
}

export class initiateResetPasswordDto {
  @ApiProperty({
    type: String,
    format: "email",
  })
  @IsEmail()
  email: string;
}

export class resetPasswordDto extends verifyEmailDto {
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,}$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  })
  new_password: string;
}
