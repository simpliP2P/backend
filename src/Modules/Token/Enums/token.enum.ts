export interface TokenData {
  token: string;
  expires_at: Date;
  type: TokenType;
  user_id: string;
}

export enum TokenType {
  EMAIL_VERIFICATION = "email_verification",
  PASSWORD_RESET = "password_reset",
  ORG_INVITATION = "org_invitation",
}
