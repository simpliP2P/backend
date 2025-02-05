import { Module } from "@nestjs/common";
import { GoogleOAuthServices } from "./Google/Services/google-oauth.service";
import { GoogleOAuthController } from "./Google/Controllers/google-oauth.controller";
import { GoogleClientConfig } from "src/Infrastructure/Oauth/googleOauth.config";
import { TokenHelper } from "src/Shared/Helpers/token.helper";
import { UserModule } from "../User/Modules/user.module";
import { JwtModule } from "@nestjs/jwt";
import { AuthModule } from "../User/Modules/auth.module";

@Module({
  imports: [UserModule, JwtModule.register({}), AuthModule],
  controllers: [GoogleOAuthController],
  providers: [GoogleOAuthServices, GoogleClientConfig, TokenHelper],
})
export class OAuthModule {}
