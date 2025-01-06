import { Module } from "@nestjs/common";
import { GoogleOAuthServices } from "./Google/Services/googleOauth.service";
import { GoogleOAuthController } from "./Google/Controllers/googleOauth.controller";
import { GoogleClientConfig } from "src/Infrastructure/Oauth/googleOauth.config";
import { TokenHelper } from "src/Shared/Helpers/token.helper";
import { UserModule } from "../User/Modules/user.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [UserModule, JwtModule.register({})],
  controllers: [GoogleOAuthController],
  providers: [GoogleOAuthServices, GoogleClientConfig, TokenHelper],
})
export class GoogleOAuthModule {}
