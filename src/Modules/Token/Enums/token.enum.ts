export interface TokenData {
  token: string;
  expiresAt: Date;
  type: TokenType;
  userId: string;
}

export enum TokenType {
  EMAIL_VERIFICATION = "email_verification",
  PASSWORD_RESET = "password_reset",
}
