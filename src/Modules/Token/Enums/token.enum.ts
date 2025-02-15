export interface TokenData {
  token: string;
  expires_at: Date;
  type: TokenType;
  user_id: string;
  meta_data?: MetaData;
}

export enum TokenType {
  EMAIL_VERIFICATION = "email_verification",
  PASSWORD_RESET = "password_reset",
  ORG_INVITATION = "org_invitation",
  REFRESH_TOKEN = "refresh_token",
}

export interface MetaData {
  [key: string]: any;
}
