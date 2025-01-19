import { Injectable } from "@nestjs/common";
import {
  GoogleClientConfig,
  TokenPayload,
} from "../../../../Infrastructure/Oauth/googleOauth.config";
import { ProviderType } from "src/Modules/User/Enums/user.enum";
import { CreateGoogleAccountInput } from "src/Modules/User/Types/userTypes";
import { UserService } from "src/Modules/User/Services/user.service";
import { TokenHelper } from "src/Shared/Helpers/token.helper";
import { HandleCustomerGoogleLoginCallbackInput } from "../Dtos/googleOauth.dto";

@Injectable()
export class GoogleOAuthServices {
  constructor(
    private readonly googleClientConfig: GoogleClientConfig,
    private readonly userService: UserService,
    private readonly tokenHelper: TokenHelper,
  ) {}

  /**
   * Handles the callback for customer Google login.
   * @param data - Input data containing the authorization code.
   * @returns An object containing the token.
   */
  public async handleCustomerGoogleSignUpOrLoginCallback(
    data: HandleCustomerGoogleLoginCallbackInput,
  ): Promise<{ token: string }> {
    try {
      // Step 1: Get tokens from Google API
      const { tokens } = await this.googleClientConfig.googleClient.getToken(
        data.code,
      );

      // Step 2: Set credentials
      this.googleClientConfig.googleClient.setCredentials(tokens);

      // Step 3: Get user data from Google
      const {
        email,
        given_name: first_name,
        family_name: last_name,
        email_verified: isVerified,
      } = await this.getGoogleUserPayload(tokens);

      // Step 4: Fetch account if it exists
      const foundAccount = await this.userService.findAccount({
        where: { email },
      });

      if (!email || !first_name || !last_name || isVerified === undefined) {
        throw new Error("Invalid Google user data");
      }
      // Step 5: Handle account login or creation
      return foundAccount
        ? this.assignSessionToExistingAccount(foundAccount)
        : this.createNewCustomerAccount(first_name, last_name, email, isVerified);
    } catch (error) {
      throw new Error(
        `Error handling Google sign-up or login callback: ${error.message}`,
      );
    }
  }

  /**
   * Initiates customer Google login/sign-up.
   * @returns Google OAuth2 authorization URL.
   */
  public initiateSignUpOrLoginCustomerWithGoogle(): string {
    return this.googleClientConfig.googleClient.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    });
  }

  /**
   * Creates a new customer account.
   */
  private async createNewCustomerAccount(
    first_name: string,
    last_name: string,
    email: string,
    is_verified: boolean,
  ): Promise<{ token: string }> {
    const accountPayload: CreateGoogleAccountInput = {
      first_name,
      last_name,
      email,
      is_verified,
      provider: "google" as ProviderType,
      verified_at: new Date(),
    };

    const createdAccount =
      await this.userService.createGoogleAccount(accountPayload);

    return this.assignSession(createdAccount);
  }

  /**
   * Assigns a session to an existing account.
   */
  private async assignSessionToExistingAccount(
    account: any,
  ): Promise<{ token: string }> {
    return this.assignSession(account);
  }

  /**
   * Assigns a session to an account.
   */
  private async assignSession(account: any): Promise<{ token: string }> {
    const userId = account._id;

    const token = this.tokenHelper.generateAccessToken({
      id: userId,
      role: "user",
    });

    await this.userService.updateLastLogin(userId);

    return { token };
  }

  /**
   * Retrieves the payload of the Google user.
   */
  private async getGoogleUserPayload(tokens: any): Promise<TokenPayload> {
    try {
      const ticket = await this.googleClientConfig.googleClient.verifyIdToken({
        idToken: tokens.id_token || "",
        audience: this.googleClientConfig.googleClient._clientId,
      });

      return ticket.getPayload() as TokenPayload;
    } catch (error) {
      throw new Error(`Error retrieving Google user payload: ${error.message}`);
    }
  }
}
