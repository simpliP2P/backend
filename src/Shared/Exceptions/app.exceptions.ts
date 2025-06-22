import { HttpException, HttpStatus } from "@nestjs/common";

export class AppException extends HttpException {
  public readonly error: string | null;

  constructor(
    public readonly appStatus: string,
    statusCode: number,
    message: string,
    error: any,
  ) {
    super({ status: appStatus, message, error, statusCode }, statusCode);
    this.error = error;
  }
}

export class EmailExistsException extends AppException {
  constructor() {
    super("error", HttpStatus.CONFLICT, "Email already exists", null);
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    super("error", HttpStatus.UNAUTHORIZED, "Invalid email or password", null);
  }
}

export class TokenExpiredException extends AppException {
  constructor() {
    super("error", HttpStatus.UNAUTHORIZED, "Token expired", null);
  }
}

export class InvalidTokenException extends AppException {
  constructor() {
    super("error", HttpStatus.BAD_REQUEST, "Token invalid", null);
  }
}

export class UserNotFoundException extends AppException {
  constructor() {
    super("error", HttpStatus.NOT_FOUND, "User not found", null);
  }
}

export class BadRequestException extends AppException {
  constructor(info: string) {
    super("error", HttpStatus.BAD_REQUEST, info, null);
  }
}

export class UserHasOrganisation extends AppException {
  constructor() {
    super(
      "error",
      HttpStatus.FORBIDDEN,
      "User is already associated with an organisation.",
      null,
    );
  }
}

export class OrganisationExists extends AppException {
  constructor(name: string) {
    super(
      "error",
      HttpStatus.CONFLICT,
      `Organisation with name ${name} already exists`,
      null,
    );
  }
}

export class SupplierExists extends AppException {
  constructor() {
    super(
      "error",
      HttpStatus.CONFLICT,
      `Supplier with email or phone already exists`,
      null,
    );
  }
}
