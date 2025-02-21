import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from "class-validator";

export class SignUpDto {
  @IsString()
  @MinLength(3)
  first_name: string;

  @IsString()
  @MinLength(3)
  last_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,}$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  })
  password: string;

  @IsString()
  @IsOptional()
  profile_picture: string;

  @IsString()
  @IsOptional()
  phone: string;
}

export class loginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class verifyEmailDto {
  @IsString()
  token: string;
}

export class initiateResetPasswordDto {
  @IsString()
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
