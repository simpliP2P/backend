import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client, TokenPayload } from "google-auth-library";

@Injectable()
class GoogleClientConfig {
  public googleClient: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.googleClient = new OAuth2Client({
      clientId: this.configService.getOrThrow<string>("oauth.google.clientId"),
      clientSecret: this.configService.getOrThrow<string>(
        "oauth.google.clientSecret",
      ),
      redirectUri:
        this.configService.getOrThrow<string>("branchName") === "master"
          ? this.configService.getOrThrow<string>(
              "oauth.google.redirectUrl.productionLink",
            )
          : this.configService.getOrThrow<string>(
              "oauth.google.redirectUrl.stagingLink",
            ),
    });
  }
}

export { GoogleClientConfig, TokenPayload };
