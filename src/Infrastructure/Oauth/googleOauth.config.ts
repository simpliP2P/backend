import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client, TokenPayload } from "google-auth-library";

@Injectable()
class GoogleClientConfig {
  public googleClient: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.googleClient = new OAuth2Client({
      clientId: this.configService.get<string>("GOOGLE_CLIENT_ID"),
      clientSecret: this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
      redirectUri:
        this.configService.get<string>("BRANCH_NAME") === "main"
          ? this.configService.get<string>("PRODUCTION_REDIRECT_URL")
          : this.configService.get<string>("STAGING_REDIRECT_URL"),
    });
  }
}

export { GoogleClientConfig, TokenPayload };
